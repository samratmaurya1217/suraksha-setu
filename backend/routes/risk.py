from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from risk_engine import RiskEngine

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  RISK & ANOMALY DETECTION ROUTER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

risk_router = APIRouter(prefix="/api/risk", tags=["Risk Engine"])

# --- Request Models ---

class AQIRequest(BaseModel):
    aqi: float

class FloodRequest(BaseModel):
    current_level: float
    danger_level: float

class TsunamiRequest(BaseModel):
    magnitude: float
    depth_km: float
    is_coastal: bool

class CycloneRequest(BaseModel):
    wind_speed_kmh: float

# --- Endpoints ---

@risk_router.post("/evaluate-aqi")
async def evaluate_aqi(data: AQIRequest):
    """Evaluate AQI risk (Anomaly Detection)."""
    return RiskEngine.evaluate_aqi_risk(data.aqi)

@risk_router.post("/evaluate-flood")
async def evaluate_flood(data: FloodRequest):
    """Evaluate Flood risk (Anomaly Detection)."""
    return RiskEngine.evaluate_flood_risk(data.current_level, data.danger_level)

@risk_router.post("/evaluate-tsunami")
async def evaluate_tsunami(data: TsunamiRequest):
    """Evaluate Tsunami risk (Anomaly Detection)."""
    return RiskEngine.evaluate_tsunami_risk(data.magnitude, data.depth_km, data.is_coastal)

@risk_router.post("/evaluate-cyclone")
async def evaluate_cyclone(data: CycloneRequest):
    """Evaluate Cyclone risk (Anomaly Detection)."""
    return RiskEngine.evaluate_cyclone_risk(data.wind_speed_kmh)
