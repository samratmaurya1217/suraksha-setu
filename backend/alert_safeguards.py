"""
Alert Safeguards & Retraction System
Implements deterministic gating, confidence thresholds, and alert retraction.
"""
import logging
from typing import Dict, Optional
from datetime import datetime, timezone
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# --- ALERT THRESHOLDS ---
AUTO_NOTIFY_THRESHOLD = 0.70  # Auto-send notifications >= 0.70
ADVISORY_THRESHOLD = 0.45      # Show to admin, manual send
VISION_CONFIDENCE_THRESHOLD = 0.85  # Vision alone requires >= 0.85

@dataclass
class AlertDecision:
    """Decision on whether to send alert."""
    should_notify: bool
    confidence: float
    reason: str
    requires_human_review: bool = False
    retraction_template: Optional[str] = None


class AlertSafeguard:
    """
    Deterministic gating system for alerts.
    Prevents wrong AI alerts through multiple validation layers.
    """
    
    @staticmethod
    def evaluate_alert_safety(
        risk_score: float,
        alert_source: str,
        confidence: float = 1.0,
        vision_verdict: Optional[Dict] = None
    ) -> AlertDecision:
        """
        Determines if alert should be auto-sent, flagged, or blocked.
        
        Args:
            risk_score: Deterministic risk score from risk_engine (0-1)
            alert_source: "risk_engine", "vision", "manual"
            confidence: AI confidence if applicable
            vision_verdict: Optional vision classification result
        
        Returns:
            AlertDecision object
        """
        
        # --- RULE 1: Deterministic Risk Engine has priority ---
        if alert_source == "risk_engine":
            if risk_score >= AUTO_NOTIFY_THRESHOLD:
                return AlertDecision(
                    should_notify=True,
                    confidence=risk_score,
                    reason="Deterministic risk score above threshold",
                    requires_human_review=False
                )
            elif risk_score >= ADVISORY_THRESHOLD:
                return AlertDecision(
                    should_notify=False,
                    confidence=risk_score,
                    reason="Risk score in advisory range - requires admin approval",
                    requires_human_review=True
                )
            else:
                return AlertDecision(
                    should_notify=False,
                    confidence=risk_score,
                    reason="Risk score below advisory threshold",
                    requires_human_review=False
                )
        
        # --- RULE 2: Vision-only alerts (stricter criteria) ---
        if alert_source == "vision":
            if not vision_verdict:
                return AlertDecision(
                    should_notify=False,
                    confidence=0.0,
                    reason="Vision verdict missing",
                    requires_human_review=False
                )
            
            vision_confidence = vision_verdict.get("confidence", 0.0)
            
            # Requires high confidence + corroboration
            if vision_confidence >= VISION_CONFIDENCE_THRESHOLD:
                # Check for corroborating evidence
                has_corroboration = vision_verdict.get("has_corroboration", False)
                
                if has_corroboration:
                    return AlertDecision(
                        should_notify=True,
                        confidence=vision_confidence,
                        reason="High-confidence vision + corroboration",
                        requires_human_review=False
                    )
                else:
                    return AlertDecision(
                        should_notify=False,
                        confidence=vision_confidence,
                        reason="High vision confidence but no corroboration",
                        requires_human_review=True
                    )
            
            # Medium confidence - always requires human review
            elif vision_confidence >= 0.6:
                return AlertDecision(
                    should_notify=False,
                    confidence=vision_confidence,
                    reason="Medium vision confidence - requires review",
                    requires_human_review=True
                )
            
            else:
                return AlertDecision(
                    should_notify=False,
                    confidence=vision_confidence,
                    reason="Low vision confidence - blocked",
                    requires_human_review=False
                )
        
        # --- RULE 3: Manual alerts (admin-triggered) ---
        if alert_source == "manual":
            return AlertDecision(
                should_notify=True,
                confidence=1.0,
                reason="Manual admin override",
                requires_human_review=False
            )
        
        # Default: block
        return AlertDecision(
            should_notify=False,
            confidence=0.0,
            reason="Unknown source or failed safety check",
            requires_human_review=False
        )


class AlertRetraction:
    """Handles alert retractions and corrections."""
    
    RETRACTION_TEMPLATE = (
        "Correction from Suraksha Setu: An earlier alert about {alert_type} "
        "at {location} was incorrect. No action required. We apologise for the error."
    )
    
    @staticmethod
    def create_retraction_message(alert: Dict) -> str:
        """Generate retraction message for alert."""
        return AlertRetraction.RETRACTION_TEMPLATE.format(
            alert_type=alert.get("alert_type", "disaster"),
            location=alert.get("location", {}).get("city", "your area")
        )
    
    @staticmethod
    async def retract_alert(alert_id: str, reason: str) -> Dict:
        """
        Retract an alert and log incident.
        
        Args:
            alert_id: ID of alert to retract
            reason: Reason for retraction
        
        Returns:
            Retraction result
        """
        from database import AsyncSessionLocal, Alert, IncidentLog
        
        async with AsyncSessionLocal() as db:
            # Update alert status
            alert = await db.get(Alert, alert_id)
            if not alert:
                return {"success": False, "error": "Alert not found"}
            
            alert.is_active = False
            alert.retracted = True
            alert.retraction_reason = reason
            alert.retracted_at = datetime.now(timezone.utc)
            
            # Log incident
            incident = IncidentLog(
                alert_id=alert_id,
                incident_type="false_positive",
                reason=reason,
                corrective_action="Alert retracted and users notified",
                created_at=datetime.now(timezone.utc)
            )
            db.add(incident)
            
            await db.commit()
            
            logger.warning(f"⚠️  Alert {alert_id} retracted: {reason}")
            
            return {
                "success": True,
                "alert_id": alert_id,
                "retraction_message": AlertRetraction.create_retraction_message(alert.__dict__)
            }


# Singletons
safeguard = AlertSafeguard()
retraction_service = AlertRetraction()
