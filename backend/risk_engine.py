import logging
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskEngine:
    """
    Deterministic Risk Analysis Engine.
    Evaluates sensor/API data against strict thresholds to generate alerts.
    NO AI is used here to ensure safety and predictability.
    """

    # --- Thresholds ---
    
    # AQI (US Standards)
    AQI_THRESHOLDS = {
        "good": (0, 50),
        "moderate": (51, 100),
        "unhealthy_sensitive": (101, 150),
        "unhealthy": (151, 200),
        "very_unhealthy": (201, 300),
        "hazardous": (301, 500)
    }

    # Flood (Water Level in meters relative to danger mark)
    FLOOD_THRESHOLDS = {
        "warning": 0.5,  # 0.5m below danger
        "danger": 0.0,   # At danger mark
        "critical": 1.0  # 1m above danger
    }

    # Tsunami (Magnitude & Depth & Location)
    # Simplified logic: High magnitude ocean/coastal quake = potential tsunami
    TSUNAMI_MIN_MAGNITUDE = 6.5
    TSUNAMI_MAX_DEPTH_KM = 100.0

    @staticmethod
    def evaluate_aqi_risk(aqi_value: float) -> dict:
        """
        Evaluate AQI risk.
        Returns: {risk_level, severity, action_needed, risk_score (0-1)}
        """
        # Normalize to 0-1 scale (500 = max AQI)
        risk_score = min(aqi_value / 500.0, 1.0)
        
        if aqi_value <= 50:
            return {"level": "Good", "severity": "low", "alert": False, "risk_score": risk_score}
        elif aqi_value <= 100:
            return {"level": "Moderate", "severity": "low", "alert": False, "risk_score": risk_score}
        elif aqi_value <= 150:
            return {"level": "Unhealthy for Sensitive Groups", "severity": "medium", "alert": True, "risk_score": risk_score}
        elif aqi_value <= 200:
            return {"level": "Unhealthy", "severity": "high", "alert": True, "risk_score": risk_score}
        elif aqi_value <= 300:
            return {"level": "Very Unhealthy", "severity": "critical", "alert": True, "risk_score": risk_score}
        else:
            return {"level": "Hazardous", "severity": "critical", "alert": True, "risk_score": risk_score}

    @staticmethod
    def evaluate_flood_risk(current_level: float, danger_level: float) -> dict:
        """
        Evaluate Flood risk.
        current_level: Current water level
        danger_level: Official danger mark for that river/dam
        Returns: {level, severity, alert, risk_score (0-1)}
        """
        diff = current_level - danger_level
        
        # Normalize risk_score: 0m diff = 0.5, +2m = 1.0, -2m = 0.0
        risk_score = max(0.0, min(1.0, (diff + 2.0) / 4.0))
        
        if diff >= RiskEngine.FLOOD_THRESHOLDS["critical"]:
            return {"level": "Critical Flood", "severity": "critical", "alert": True, "risk_score": risk_score}
        elif diff >= RiskEngine.FLOOD_THRESHOLDS["danger"]:
            return {"level": "Flood Danger", "severity": "high", "alert": True, "risk_score": risk_score}
        elif diff >= -RiskEngine.FLOOD_THRESHOLDS["warning"]:
            return {"level": "Flood Warning", "severity": "medium", "alert": True, "risk_score": risk_score}
        else:
            return {"level": "Normal", "severity": "low", "alert": False, "risk_score": risk_score}

    @staticmethod
    def evaluate_tsunami_risk(magnitude: float, depth_km: float, is_coastal: bool) -> dict:
        """
        Evaluate Tsunami potential based on earthquake parameters.
        Returns: {level, severity, alert, risk_score (0-1)}
        """
        if not is_coastal:
             return {"level": "No Tsunami Risk (Inland)", "severity": "low", "alert": False, "risk_score": 0.0}

        # Risk score based on magnitude (6.5 = 0.5, 9.0 = 1.0)
        risk_score = max(0.0, min(1.0, (magnitude - 5.0) / 4.0))
        
        if magnitude >= RiskEngine.TSUNAMI_MIN_MAGNITUDE and depth_km <= RiskEngine.TSUNAMI_MAX_DEPTH_KM:
             return {"level": "Tsunami Potential", "severity": "critical", "alert": True, "risk_score": risk_score}
        
        return {"level": "No significant Tsunami Risk", "severity": "low", "alert": False, "risk_score": risk_score}

    @staticmethod
    def evaluate_cyclone_risk(wind_speed_kmh: float) -> dict:
        """Evaluate Cyclone severity based on IMD/Global standards"""
        if wind_speed_kmh < 31:
            return {"level": "Low Wind", "severity": "low", "alert": False}
        elif wind_speed_kmh < 50:
             return {"level": "Squally Weather", "severity": "medium", "alert": True}
        elif wind_speed_kmh < 89:
             return {"level": "Cyclonic Storm", "severity": "high", "alert": True}
        elif wind_speed_kmh < 118:
             return {"level": "Severe Cyclonic Storm", "severity": "high", "alert": True}
        elif wind_speed_kmh < 221:
             return {"level": "Very Severe Cyclonic Storm", "severity": "critical", "alert": True}
        else:
             return {"level": "Super Cyclone", "severity": "critical", "alert": True}
