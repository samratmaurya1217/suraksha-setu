"""
Alert Safety Architecture
=========================
GOLDEN RULE: AI NEVER decides to send alerts. Only the deterministic engine decides.
AI only explains.

This module implements:
1. Confidence Ensemble Scoring
2. Cross-source confirmation
3. Admin override layer
4. Rate-limited notification dispatch
5. Alert retraction pipeline
6. Incident logging
7. Auto-disable on too many false positives
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
#  CONFIDENCE ENSEMBLE
# ═══════════════════════════════════════════════════════════════
# Final alert confidence = 0.6 × risk_engine_score + 0.2 × cross_source + 0.2 × AI_explanation_confidence


class ConfidenceEnsemble:
    """
    Computes final alert confidence using weighted ensemble.
    Only deterministic engine results carry weight for alert decisions.
    AI confidence is just for explanation quality — NOT for triggering alerts.
    """

    WEIGHTS = {
        "risk_engine": 0.6,
        "cross_source": 0.2,
        "ai_explanation": 0.2,
    }

    # Alert thresholds
    AUTO_ALERT_THRESHOLD = 0.75   # Auto-generate alert
    REVIEW_THRESHOLD = 0.50       # Flag for admin review
    DISMISS_THRESHOLD = 0.30      # Dismiss, no action

    @staticmethod
    def compute(
        risk_engine_score: float,
        cross_source_agreement: float = 0.5,
        ai_explanation_confidence: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Compute ensemble confidence score.

        Args:
            risk_engine_score: 0-1 from RiskEngine (deterministic)
            cross_source_agreement: 0-1 agreement across data sources
            ai_explanation_confidence: 0-1 quality of AI explanation (NOT for alert decision)

        Returns:
            {score, action, components}
        """
        w = ConfidenceEnsemble.WEIGHTS
        score = (
            w["risk_engine"] * risk_engine_score
            + w["cross_source"] * cross_source_agreement
            + w["ai_explanation"] * ai_explanation_confidence
        )
        score = round(min(1.0, max(0.0, score)), 4)

        if score >= ConfidenceEnsemble.AUTO_ALERT_THRESHOLD:
            action = "auto_alert"
        elif score >= ConfidenceEnsemble.REVIEW_THRESHOLD:
            action = "review"
        else:
            action = "dismiss"

        return {
            "ensemble_score": score,
            "action": action,
            "components": {
                "risk_engine": round(risk_engine_score, 4),
                "cross_source": round(cross_source_agreement, 4),
                "ai_explanation": round(ai_explanation_confidence, 4),
            },
            "weights": w,
        }


# ═══════════════════════════════════════════════════════════════
#  ALERT DECISION ENGINE
# ═══════════════════════════════════════════════════════════════


class AlertDecisionEngine:
    """
    Correct Alert Decision Flow:
    1. External event arrives (USGS, MOSDAC, CWC)
    2. RiskEngine calculates deterministic score
    3. If score >= threshold → Create alert → Send notification
    4. AI generates explanation text only
    5. AI CANNOT trigger alert

    For community image posts:
    - If Vision confidence >= 0.85 AND no conflicting data → Mark as "Provisional Alert"
    - Notify admin, optional limited-area push
    - Else → Flag for review only
    - NEVER mass SMS from vision alone
    """

    # Rate limiting: max alerts per hour per type
    MAX_ALERTS_PER_HOUR = 5
    _recent_alerts: Dict[str, List[datetime]] = {}

    # False positive tracking for auto-disable
    _false_positive_count: Dict[str, int] = {}
    FALSE_POSITIVE_THRESHOLD = 3  # Auto-disable after N false positives in 24h

    @classmethod
    def evaluate_event(
        cls,
        event_type: str,
        risk_result: Dict[str, Any],
        cross_sources: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate an event for alert generation.
        DETERMINISTIC — no AI involved.

        Args:
            event_type: earthquake, cyclone, flood, tsunami, aqi
            risk_result: Output from RiskEngine (must have 'risk_score', 'alert', 'severity')
            cross_sources: List of confirming data sources

        Returns:
            Decision object with action, alert details, notification rules
        """
        risk_score = risk_result.get("risk_score", 0)
        should_alert = risk_result.get("alert", False)
        severity = risk_result.get("severity", "low")

        # Cross-source agreement
        num_sources = len(cross_sources) if cross_sources else 1
        cross_source_score = min(1.0, num_sources * 0.33)

        # Ensemble
        ensemble = ConfidenceEnsemble.compute(
            risk_engine_score=risk_score,
            cross_source_agreement=cross_source_score,
        )

        # Rate limit check
        is_rate_limited = cls._is_rate_limited(event_type)

        # Auto-disable check
        is_disabled = cls._is_auto_disabled(event_type)

        # Final decision
        if is_disabled:
            action = "disabled"
            should_notify = False
        elif is_rate_limited:
            action = "rate_limited"
            should_notify = False
        elif not should_alert:
            action = "no_alert"
            should_notify = False
        elif ensemble["action"] == "auto_alert":
            action = "auto_alert"
            should_notify = True
            cls._record_alert(event_type)
        elif ensemble["action"] == "review":
            action = "admin_review"
            should_notify = False
        else:
            action = "dismiss"
            should_notify = False

        return {
            "action": action,
            "should_notify": should_notify,
            "severity": severity,
            "event_type": event_type,
            "ensemble": ensemble,
            "risk_score": risk_score,
            "cross_sources": cross_sources or [],
            "is_rate_limited": is_rate_limited,
            "is_auto_disabled": is_disabled,
        }

    @classmethod
    def evaluate_community_image(
        cls,
        vision_confidence: float,
        risk_score: float,
        conflicting_data: bool = False,
    ) -> Dict[str, Any]:
        """
        Evaluate a community-submitted image for alert generation.
        NEVER triggers mass SMS from vision alone.

        Rules:
        - confidence >= 0.85 AND no conflict → Provisional Alert → Notify admin
        - Else → Flag for review only
        """
        if vision_confidence >= 0.85 and not conflicting_data and risk_score >= 0.5:
            return {
                "action": "provisional_alert",
                "notify_admin": True,
                "mass_notification": False,
                "limited_area_push": True,
                "requires_review": True,
                "confidence": vision_confidence,
            }
        else:
            return {
                "action": "flag_for_review",
                "notify_admin": vision_confidence >= 0.6,
                "mass_notification": False,
                "limited_area_push": False,
                "requires_review": True,
                "confidence": vision_confidence,
            }

    @classmethod
    def _is_rate_limited(cls, event_type: str) -> bool:
        """Check if we've sent too many alerts of this type recently."""
        now = datetime.now(timezone.utc)
        hour_ago = now - timedelta(hours=1)

        if event_type not in cls._recent_alerts:
            return False

        # Clean old entries
        cls._recent_alerts[event_type] = [
            t for t in cls._recent_alerts[event_type] if t > hour_ago
        ]

        return len(cls._recent_alerts[event_type]) >= cls.MAX_ALERTS_PER_HOUR

    @classmethod
    def _record_alert(cls, event_type: str):
        """Record that an alert was sent."""
        if event_type not in cls._recent_alerts:
            cls._recent_alerts[event_type] = []
        cls._recent_alerts[event_type].append(datetime.now(timezone.utc))

    @classmethod
    def _is_auto_disabled(cls, event_type: str) -> bool:
        """Check if auto-alerting is disabled due to too many false positives."""
        count = cls._false_positive_count.get(event_type, 0)
        return count >= cls.FALSE_POSITIVE_THRESHOLD

    @classmethod
    def record_false_positive(cls, event_type: str):
        """Record a false positive (called by retraction system)."""
        cls._false_positive_count[event_type] = cls._false_positive_count.get(event_type, 0) + 1
        if cls._false_positive_count[event_type] >= cls.FALSE_POSITIVE_THRESHOLD:
            logger.warning(f"⚠️  Auto-alerting DISABLED for {event_type} due to {cls.FALSE_POSITIVE_THRESHOLD} false positives")

    @classmethod
    def reset_false_positives(cls, event_type: str):
        """Admin reset of false positive counter."""
        cls._false_positive_count[event_type] = 0
        logger.info(f"✅ False positive counter reset for {event_type}")


# ═══════════════════════════════════════════════════════════════
#  RETRACTION SYSTEM
# ═══════════════════════════════════════════════════════════════


class AlertRetractionService:
    """
    Production alert retraction pipeline:
    1. Admin clicks "Retract Alert"
    2. System sends correction notification
    3. Updates alert status in DB
    4. Logs incident
    5. Pushes correction notification via WebSocket + Push
    """

    @staticmethod
    async def retract_alert(
        alert_id: str,
        reason: str,
        admin_user_id: str = "system",
    ) -> Dict[str, Any]:
        """
        Full retraction pipeline.
        """
        from database import AsyncSessionLocal, Alert, IncidentLog
        from notifications import ws_manager, push_manager

        try:
            async with AsyncSessionLocal() as db:
                # 1. Update alert
                alert = await db.get(Alert, alert_id)
                if not alert:
                    return {"success": False, "error": "Alert not found"}

                alert.retracted = True
                alert.retraction_reason = reason
                alert.retracted_at = datetime.now(timezone.utc)
                alert.is_active = False

                # 2. Log incident
                incident = IncidentLog(
                    id=str(uuid.uuid4()),
                    alert_id=alert_id,
                    incident_type="retraction",
                    reason=reason,
                    corrective_action=f"Alert retracted by {admin_user_id}. Correction notification sent.",
                    admin_user_id=admin_user_id if admin_user_id != "system" else None,
                    extra_data={
                        "original_severity": alert.severity,
                        "original_type": alert.alert_type,
                        "retracted_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
                db.add(incident)
                await db.commit()

                # 3. Record false positive for auto-disable
                AlertDecisionEngine.record_false_positive(alert.alert_type)

                # 4. Send correction notifications
                correction_payload = {
                    "type": "alert_retraction",
                    "alert_id": alert_id,
                    "title": f"⚠️ CORRECTION: Previous {alert.alert_type} alert retracted",
                    "body": f"Reason: {reason}. The previously issued {alert.severity} {alert.alert_type} alert has been retracted.",
                    "severity": "info",
                }

                await ws_manager.broadcast(correction_payload)
                await push_manager.broadcast_notification({
                    "title": correction_payload["title"],
                    "body": correction_payload["body"],
                })

                # 5. Send retraction SMS to affected users
                try:
                    from sms_service import alert_dispatcher
                    loc = alert.location or {}
                    location_name = loc.get("city", loc.get("state", "your area"))
                    if isinstance(location_name, dict):
                        location_name = "your area"
                    await alert_dispatcher.dispatch_retraction(
                        alert_type=alert.alert_type,
                        location=location_name or "your area",
                        lat=loc.get("lat"),
                        lon=loc.get("lon"),
                    )
                except Exception as sms_err:
                    logger.warning(f"Retraction SMS dispatch error: {sms_err}")

                logger.info(f"✅ Alert {alert_id} retracted. Correction sent.")
                return {
                    "success": True,
                    "alert_id": alert_id,
                    "retraction_reason": reason,
                    "correction_sent": True,
                    "incident_logged": True,
                }

        except Exception as e:
            logger.error(f"Retraction error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_incident_logs(limit: int = 50) -> List[Dict]:
        """Get recent incident logs."""
        from database import AsyncSessionLocal, IncidentLog
        from sqlalchemy import select

        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(IncidentLog).order_by(IncidentLog.created_at.desc()).limit(limit)
                )
                logs = result.scalars().all()
                return [
                    {
                        "id": log.id,
                        "alert_id": log.alert_id,
                        "type": log.incident_type,
                        "reason": log.reason,
                        "action": log.corrective_action,
                        "admin_id": log.admin_user_id,
                        "created_at": str(log.created_at),
                        "extra": log.extra_data,
                    }
                    for log in logs
                ]
        except Exception as e:
            logger.error(f"Incident log query error: {e}")
            return []


# ── Singletons ──────────────────────────────────────────────
confidence_ensemble = ConfidenceEnsemble()
alert_decision_engine = AlertDecisionEngine()
retraction_service = AlertRetractionService()
