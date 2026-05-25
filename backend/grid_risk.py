"""
Geospatial Grid-Based Risk Engine
=================================
Converts user GPS → 10km radius → grid cells → fetch data → evaluate risk → AR overlay.

Architecture:
  User GPS → 10km circle geometry → intersect 5km grid cells →
  fetch latest environmental data per cell → deviation check →
  if anomaly → one-time AI reasoning → else cached state →
  return unified risk + AR grid data.

Key principles:
  - No per-PIN computation
  - No constant AI calls
  - Grid cells are shared across users
  - AI runs on anomaly only
  - AR visualizes, never reasons
"""

import math
import time
import os
import logging
import asyncio
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
#  CONFIG
# ═══════════════════════════════════════════════════════════════
GRID_SIZE_KM = 5.0            # Each grid cell is 5km × 5km
DEFAULT_RADIUS_KM = 10.0      # Default user radius
CACHE_TTL_SECONDS = 300        # Grid state valid for 5 minutes
ANOMALY_DEVIATION = 0.25       # 25% deviation from baseline triggers AI

# Approximate conversion: 1° latitude ≈ 111 km
KM_PER_DEG_LAT = 111.0
GRID_DEG = GRID_SIZE_KM / KM_PER_DEG_LAT  # ~0.045°


# ═══════════════════════════════════════════════════════════════
#  GRID CELL ID
# ═══════════════════════════════════════════════════════════════
@dataclass
class GridCell:
    """A single 5km × 5km grid cell identified by its SW corner."""
    row: int
    col: int
    lat_min: float
    lon_min: float
    lat_max: float
    lon_max: float

    @property
    def cell_id(self) -> str:
        return f"g_{self.row}_{self.col}"

    @property
    def center(self) -> Tuple[float, float]:
        return (
            (self.lat_min + self.lat_max) / 2,
            (self.lon_min + self.lon_max) / 2,
        )


def _lat_to_row(lat: float) -> int:
    return int(math.floor(lat / GRID_DEG))


def _lon_to_col(lon: float, lat: float) -> int:
    km_per_deg_lon = KM_PER_DEG_LAT * math.cos(math.radians(lat))
    grid_deg_lon = GRID_SIZE_KM / max(km_per_deg_lon, 1e-6)
    return int(math.floor(lon / grid_deg_lon))


def _grid_deg_lon(lat: float) -> float:
    km_per_deg_lon = KM_PER_DEG_LAT * math.cos(math.radians(lat))
    return GRID_SIZE_KM / max(km_per_deg_lon, 1e-6)


def get_grid_cell(lat: float, lon: float) -> GridCell:
    """Return the grid cell containing the given point."""
    row = _lat_to_row(lat)
    deg_lon = _grid_deg_lon(lat)
    col = int(math.floor(lon / deg_lon))
    return GridCell(
        row=row, col=col,
        lat_min=row * GRID_DEG,
        lon_min=col * deg_lon,
        lat_max=(row + 1) * GRID_DEG,
        lon_max=(col + 1) * deg_lon,
    )


# ═══════════════════════════════════════════════════════════════
#  STEP 1: 10km radius → grid cells (pure geometry, no AI)
# ═══════════════════════════════════════════════════════════════
def cells_in_radius(lat: float, lon: float, radius_km: float = DEFAULT_RADIUS_KM) -> List[GridCell]:
    """
    Compute which grid cells intersect a circle of `radius_km` around (lat, lon).
    Uses bounding-box expansion then checks centre-distance.
    Typically returns 12–16 cells for a 10km radius with 5km grid.
    """
    delta_lat = radius_km / KM_PER_DEG_LAT
    km_per_deg_lon = KM_PER_DEG_LAT * math.cos(math.radians(lat))
    delta_lon = radius_km / max(km_per_deg_lon, 1e-6)

    lat_lo = lat - delta_lat
    lat_hi = lat + delta_lat
    lon_lo = lon - delta_lon
    lon_hi = lon + delta_lon

    cells: List[GridCell] = []
    deg_lon_at_lat = _grid_deg_lon(lat)

    row_lo = int(math.floor(lat_lo / GRID_DEG))
    row_hi = int(math.floor(lat_hi / GRID_DEG))
    col_lo = int(math.floor(lon_lo / deg_lon_at_lat))
    col_hi = int(math.floor(lon_hi / deg_lon_at_lat))

    for r in range(row_lo, row_hi + 1):
        for c in range(col_lo, col_hi + 1):
            cell = GridCell(
                row=r, col=c,
                lat_min=r * GRID_DEG,
                lon_min=c * deg_lon_at_lat,
                lat_max=(r + 1) * GRID_DEG,
                lon_max=(c + 1) * deg_lon_at_lat,
            )
            # Check if cell centre is within radius (cheaper than full intersection)
            clat, clon = cell.center
            dist = _haversine(lat, lon, clat, clon)
            if dist <= radius_km + GRID_SIZE_KM * 0.707:  # Include cells partially inside
                cells.append(cell)

    logger.info(f"Grid: ({lat:.4f}, {lon:.4f}) r={radius_km}km → {len(cells)} cells")
    return cells


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


# ═══════════════════════════════════════════════════════════════
#  GRID CELL STATE
# ═══════════════════════════════════════════════════════════════
@dataclass
class CellState:
    """Current environmental + risk state for one grid cell."""
    cell_id: str
    lat: float
    lon: float
    lat_min: float
    lon_min: float
    lat_max: float
    lon_max: float

    # Environmental readings (Step 2)
    rainfall_mm: float = 0.0
    wind_speed_kmh: float = 0.0
    humidity_pct: float = 0.0
    pressure_hpa: float = 1013.0
    temperature_c: float = 25.0
    aqi: float = 0.0
    satellite_anomaly: float = 0.0   # 0–1 normalized

    # Risk evaluation (Step 3)
    risk_level: str = "low"          # low | medium | high | critical
    risk_score: float = 0.0          # 0–1
    deviation_score: float = 0.0     # How far from baseline
    risk_factors: List[str] = field(default_factory=list)

    # Cache control
    updated_at: float = 0.0         # epoch
    ai_explanation: Optional[str] = None
    ai_triggered: bool = False

    def is_stale(self) -> bool:
        return (time.time() - self.updated_at) > CACHE_TTL_SECONDS

    def to_dict(self) -> dict:
        d = asdict(self)
        d["age_seconds"] = round(time.time() - self.updated_at) if self.updated_at else None
        return d


# ═══════════════════════════════════════════════════════════════
#  BASELINES (regional averages for deviation detection)
# ═══════════════════════════════════════════════════════════════
REGIONAL_BASELINES = {
    "default": {
        "rainfall_mm": 5.0,
        "wind_speed_kmh": 15.0,
        "humidity_pct": 60.0,
        "pressure_hpa": 1013.0,
        "aqi": 80.0,
    },
    "coastal": {
        "rainfall_mm": 8.0,
        "wind_speed_kmh": 25.0,
        "humidity_pct": 75.0,
        "pressure_hpa": 1010.0,
        "aqi": 60.0,
    },
    "delhi_ncr": {
        "rainfall_mm": 3.0,
        "wind_speed_kmh": 10.0,
        "humidity_pct": 50.0,
        "pressure_hpa": 1015.0,
        "aqi": 150.0,
    },
}


def _get_baseline(lat: float, lon: float) -> dict:
    """Pick baseline closest to region. Simple lat/lon heuristic."""
    # Delhi NCR: ~28.5–28.8 lat, 77.0–77.5 lon
    if 28.0 <= lat <= 29.0 and 76.5 <= lon <= 77.8:
        return REGIONAL_BASELINES["delhi_ncr"]
    # Coastal: lat < 15 and lon > 74 (rough west coast) or lon > 80 (east coast)
    if lat < 15 and (lon > 79 or lon < 75):
        return REGIONAL_BASELINES["coastal"]
    return REGIONAL_BASELINES["default"]


# ═══════════════════════════════════════════════════════════════
#  STEP 2 & 3: GRID RISK SERVICE (singleton, holds cached states)
# ═══════════════════════════════════════════════════════════════
class GridRiskService:
    """
    Central service: maintains grid cell cache, fetches data, evaluates risk.
    Multiple users in the same area share the same grid states → credit-safe.
    """

    def __init__(self):
        self._cache: Dict[str, CellState] = {}

    # ─── Public API ──────────────────────────────────────────
    async def get_zone_risk(
        self,
        lat: float,
        lon: float,
        radius_km: float = DEFAULT_RADIUS_KM,
    ) -> dict:
        """
        Main entry point: GPS → grid cells → risk states → unified response.
        Returns dict ready for AR overlay rendering.
        """
        cells = cells_in_radius(lat, lon, radius_km)

        # Refresh stale cells in parallel
        stale = [c for c in cells if self._is_stale(c.cell_id)]
        if stale:
            await self._refresh_cells(stale)

        # Build response
        cell_states = [self._cache[c.cell_id] for c in cells if c.cell_id in self._cache]

        # Unified risk = worst cell in zone
        worst = max(cell_states, key=lambda s: s.risk_score) if cell_states else None
        risk_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for s in cell_states:
            risk_counts[s.risk_level] = risk_counts.get(s.risk_level, 0) + 1

        ai_needed = any(s.ai_triggered for s in cell_states)

        return {
            "center": {"lat": lat, "lon": lon},
            "radius_km": radius_km,
            "grid_size_km": GRID_SIZE_KM,
            "total_cells": len(cell_states),
            "unified_risk": {
                "level": worst.risk_level if worst else "low",
                "score": round(worst.risk_score, 3) if worst else 0,
                "factors": worst.risk_factors if worst else [],
            },
            "risk_distribution": risk_counts,
            "ai_triggered": ai_needed,
            "cells": [s.to_dict() for s in cell_states],
            "ar_overlay": self._build_ar_overlay(cell_states, lat, lon, radius_km),
        }

    async def force_refresh(self, lat: float, lon: float, radius_km: float = DEFAULT_RADIUS_KM):
        """Force-refresh all cells in radius (used when backend data updates)."""
        cells = cells_in_radius(lat, lon, radius_km)
        await self._refresh_cells(cells)

    def invalidate_region(self, lat: float, lon: float, radius_km: float):
        """Called by ingestion pipeline when new data arrives for a region."""
        cells = cells_in_radius(lat, lon, radius_km)
        for c in cells:
            if c.cell_id in self._cache:
                self._cache[c.cell_id].updated_at = 0  # Mark stale
        logger.info(f"Invalidated {len(cells)} grid cells around ({lat}, {lon})")

    # ─── Internal: check cache ───────────────────────────────
    def _is_stale(self, cell_id: str) -> bool:
        if cell_id not in self._cache:
            return True
        return self._cache[cell_id].is_stale()

    # ─── Step 2: Fetch environmental data per cell ───────────
    async def _refresh_cells(self, cells: List[GridCell]):
        """Fetch latest environmental data for each cell and evaluate risk."""
        tasks = [self._refresh_one(c) for c in cells]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _refresh_one(self, cell: GridCell):
        """Fetch data and evaluate risk for one grid cell."""
        clat, clon = cell.center
        try:
            env = await self._fetch_env_data(clat, clon)
        except Exception as e:
            logger.warning(f"Grid {cell.cell_id}: fetch failed: {e}")
            env = {}

        state = CellState(
            cell_id=cell.cell_id,
            lat=clat,
            lon=clon,
            lat_min=cell.lat_min,
            lon_min=cell.lon_min,
            lat_max=cell.lat_max,
            lon_max=cell.lon_max,
            rainfall_mm=env.get("rainfall_mm", 0),
            wind_speed_kmh=env.get("wind_speed_kmh", 0),
            humidity_pct=env.get("humidity_pct", 0),
            pressure_hpa=env.get("pressure_hpa", 1013),
            temperature_c=env.get("temperature_c", 25),
            aqi=env.get("aqi", 0),
            satellite_anomaly=env.get("satellite_anomaly", 0),
            updated_at=time.time(),
        )

        # Step 3: Evaluate risk (deterministic)
        self._evaluate_risk(state)

        self._cache[cell.cell_id] = state

    async def _fetch_env_data(self, lat: float, lon: float) -> dict:
        """
        Fetch environmental data for a point from weather + AQI APIs.
        This is cheap & pre-indexed. No AI involved.
        """
        import httpx

        data = {}
        async with httpx.AsyncClient(timeout=8) as client:
            # Open-Meteo (free, no key required)
            try:
                r = await client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current": "temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,surface_pressure",
                    },
                )
                if r.status_code == 200:
                    cur = r.json().get("current", {})
                    data["temperature_c"] = cur.get("temperature_2m", 25)
                    data["humidity_pct"] = cur.get("relative_humidity_2m", 60)
                    data["rainfall_mm"] = cur.get("precipitation", 0) or cur.get("rain", 0)
                    data["wind_speed_kmh"] = cur.get("wind_speed_10m", 0)
                    data["pressure_hpa"] = cur.get("surface_pressure", 1013)
            except Exception as e:
                logger.debug(f"Open-Meteo fetch failed for ({lat},{lon}): {e}")

            # OpenWeatherMap AQI
            owm_key = os.environ.get("OPENWEATHER_API_KEY", "")
            if owm_key:
                try:
                    r = await client.get(
                        "http://api.openweathermap.org/data/2.5/air_pollution",
                        params={"lat": lat, "lon": lon, "appid": owm_key},
                    )
                    if r.status_code == 200:
                        aq = r.json().get("list", [{}])[0].get("main", {})
                        data["aqi"] = aq.get("aqi", 0) * 50  # Convert 1-5 scale → AQI-like
                except Exception as e:
                    logger.debug(f"AQI fetch failed for ({lat},{lon}): {e}")

        return data

    # ─── Step 3: Risk evaluation (deterministic + deviation) ─
    def _evaluate_risk(self, state: CellState):
        """
        Deterministic risk evaluation.
        Deviation from baseline + multi-signal agreement → severity band.
        If anomaly detected → flag for one-time AI reasoning.
        """
        baseline = _get_baseline(state.lat, state.lon)
        deviations = []
        factors = []

        # Rainfall deviation
        bl_rain = baseline["rainfall_mm"] or 1
        if state.rainfall_mm > 0:
            dev = (state.rainfall_mm - bl_rain) / bl_rain
            deviations.append(dev)
            if dev > 0.5:
                factors.append(f"rainfall {state.rainfall_mm:.0f}mm (+{dev*100:.0f}%)")

        # Wind speed
        bl_wind = baseline["wind_speed_kmh"] or 1
        if state.wind_speed_kmh > 0:
            dev = (state.wind_speed_kmh - bl_wind) / bl_wind
            deviations.append(dev)
            if dev > 0.5:
                factors.append(f"wind {state.wind_speed_kmh:.0f}km/h (+{dev*100:.0f}%)")

        # Pressure drop (inverted — lower is worse)
        bl_pres = baseline["pressure_hpa"]
        if state.pressure_hpa > 0:
            dev = (bl_pres - state.pressure_hpa) / bl_pres
            deviations.append(dev)
            if dev > 0.01:
                factors.append(f"pressure {state.pressure_hpa:.0f}hPa (drop {dev*100:.1f}%)")

        # AQI
        bl_aqi = baseline["aqi"] or 1
        if state.aqi > 0:
            dev = (state.aqi - bl_aqi) / bl_aqi
            deviations.append(max(0, dev))
            if dev > 0.5:
                factors.append(f"AQI {state.aqi:.0f} (+{dev*100:.0f}%)")

        # Satellite anomaly (already 0–1)
        if state.satellite_anomaly > 0.3:
            deviations.append(state.satellite_anomaly)
            factors.append(f"satellite anomaly {state.satellite_anomaly:.2f}")

        # Composite deviation
        state.deviation_score = max(deviations) if deviations else 0
        state.risk_factors = factors

        # Multi-signal agreement bonus
        high_signals = sum(1 for d in deviations if d > 0.3)
        agreement_bonus = min(0.2, high_signals * 0.05)

        # Final risk score
        raw_score = min(1.0, state.deviation_score + agreement_bonus)
        state.risk_score = round(raw_score, 3)

        # Severity band
        if raw_score >= 0.75:
            state.risk_level = "critical"
        elif raw_score >= 0.50:
            state.risk_level = "high"
        elif raw_score >= 0.25:
            state.risk_level = "medium"
        else:
            state.risk_level = "low"

        # Flag for AI only on significant anomaly
        state.ai_triggered = state.deviation_score >= ANOMALY_DEVIATION and high_signals >= 2

    # ─── Step 4: AR Overlay (visualization data, no reasoning) ─
    def _build_ar_overlay(
        self,
        states: List[CellState],
        center_lat: float,
        center_lon: float,
        radius_km: float,
    ) -> dict:
        """
        Build AR overlay payload. AR does NOT reason — it visualizes
        the last validated risk state for each grid cell.
        """
        RISK_COLORS = {
            "low": "#22c55e",       # green
            "medium": "#eab308",    # yellow
            "high": "#f97316",      # orange
            "critical": "#ef4444",  # red
        }

        zones = []
        for s in states:
            zones.append({
                "cell_id": s.cell_id,
                "bounds": {
                    "sw": {"lat": s.lat_min, "lon": s.lon_min},
                    "ne": {"lat": s.lat_max, "lon": s.lon_max},
                },
                "center": {"lat": s.lat, "lon": s.lon},
                "color": RISK_COLORS.get(s.risk_level, "#22c55e"),
                "risk_level": s.risk_level,
                "risk_score": s.risk_score,
                "opacity": 0.15 + min(0.55, s.risk_score * 0.6),
                "label": ", ".join(s.risk_factors[:2]) if s.risk_factors else "Normal",
                "age_seconds": round(time.time() - s.updated_at) if s.updated_at else None,
            })

        return {
            "type": "10km_radius_overlay",
            "center": {"lat": center_lat, "lon": center_lon},
            "radius_km": radius_km,
            "zones": zones,
            "legend": {k: v for k, v in RISK_COLORS.items()},
            "note": "AR reads risk state, never reasons. Updates when backend data changes.",
        }


# ═══════════════════════════════════════════════════════════════
#  SINGLETON
# ═══════════════════════════════════════════════════════════════
grid_risk_service = GridRiskService()
