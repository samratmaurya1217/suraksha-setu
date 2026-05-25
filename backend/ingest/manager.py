import asyncio
import logging
import os
from sqlalchemy.ext.asyncio import AsyncSession
from risk_engine import RiskEngine
from alert_safety import AlertDecisionEngine, ConfidenceEnsemble
from ingest.usgs import fetch_earthquakes
from ingest.cpcb import fetch_aqi
from database import get_db, Alert, AsyncSessionLocal
from grid_risk import grid_risk_service
from sms_service import alert_dispatcher
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class IngestionManager:
    """
    Orchestrates data ingestion with proper alert safety:
    1. Fetch data from external APIs (USGS, MOSDAC metadata, CWC)
    2. Pass data to RiskEngine (Deterministic)
    3. Run through AlertDecisionEngine (ensemble scoring, rate limiting)
    4. If Decision == auto_alert → save to DB and Trigger Notification
    5. AI generates explanation ONLY — never decides alert

    Architecture:
      External feeds → Metadata Poll (cheap) → Risk Engine evaluates →
      Alert Decision Engine → If approved → Notification → AI explains
    """

    @staticmethod
    async def run_ingest_cycle(db: AsyncSession):
        logger.info("Starting Ingestion Cycle...")

        # --- Layer 1: Event Monitoring (USGS Earthquakes) ---
        quakes = await fetch_earthquakes()
        for quake in quakes:
            risk = RiskEngine.evaluate_tsunami_risk(
                magnitude=quake['magnitude'],
                depth_km=quake['depth_km'],
                is_coastal=True
            )

            # Run through Alert Decision Engine (deterministic, not AI)
            decision = AlertDecisionEngine.evaluate_event(
                event_type="tsunami" if risk['level'] == "Tsunami Potential" else "earthquake",
                risk_result=risk,
                cross_sources=["USGS"],
            )

            if decision["should_notify"]:
                new_alert = Alert(
                    id=str(uuid.uuid4()),
                    alert_type=decision["event_type"],
                    severity=decision["severity"],
                    title=f"{risk['level']}: Mag {quake['magnitude']}",
                    description=f"Automated Alert. {risk['level']} detected. Depth: {quake['depth_km']}km.",
                    location={"lat": quake['lat'], "lon": quake['lon']},
                    source="USGS",
                    created_at=datetime.now(timezone.utc),
                    is_active=True,
                    alert_metadata={
                        **risk,
                        "ensemble": decision["ensemble"],
                        "decision": decision["action"],
                    }
                )
                db.add(new_alert)
                logger.info(f"Generated Alert: {new_alert.title} (ensemble={decision['ensemble']['ensemble_score']:.2f})")

                # Invalidate grid cells around the event so AR updates
                grid_risk_service.invalidate_region(quake['lat'], quake['lon'], radius_km=50)

                # Dispatch SMS + push via deterministic dispatcher
                try:
                    await alert_dispatcher.dispatch(
                        decision=decision,
                        alert_data={
                            "alert_type": decision["event_type"],
                            "severity": decision["severity"],
                            "title": new_alert.title,
                            "description": new_alert.description,
                            "location_name": f"({quake['lat']:.2f}, {quake['lon']:.2f})",
                            "lat": quake['lat'],
                            "lon": quake['lon'],
                        },
                    )
                except Exception as e:
                    logger.warning(f"SMS/push dispatch error: {e}")
            elif decision["action"] == "admin_review":
                logger.info(f"Flagged for review: {risk['level']} Mag {quake['magnitude']} (score={decision['risk_score']:.2f})")

        await db.commit()

        # --- Layer 1: MOSDAC Metadata Polling ---
        try:
            from ingest.mosdac_poller import mosdac_poller
            metadata_results = await mosdac_poller.poll_all_datasets()
            for dataset_id, records in metadata_results.items():
                stored = await mosdac_poller.store_metadata(records)
                logger.info(f"MOSDAC Layer 1: {dataset_id} → {stored} new records stored")
        except Exception as e:
            logger.warning(f"MOSDAC polling skipped: {e}")

        logger.info("Ingestion Cycle Complete.")

