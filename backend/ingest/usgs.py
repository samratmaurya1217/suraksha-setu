import httpx
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

USGS_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"

async def fetch_earthquakes():
    """
    Fetch latest earthquakes > 2.5 magnitude from USGS.
    Returns list of dicts with standardized format.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(USGS_FEED_URL)
            response.raise_for_status()
            data = response.json()
            
            features = data.get('features', [])
            earthquakes = []
            
            for feature in features:
                props = feature.get('properties', {})
                geometry = feature.get('geometry', {})
                coords = geometry.get('coordinates', [0, 0, 0]) # lon, lat, depth
                
                # Standardize format
                eq = {
                    "source_id": f"usgs_{feature.get('id')}",
                    "title": props.get('title'),
                    "magnitude": props.get('mag'),
                    "time": datetime.fromtimestamp(props.get('time') / 1000, tz=timezone.utc),
                    "lat": coords[1],
                    "lon": coords[0],
                    "depth_km": coords[2],
                    "url": props.get('url'),
                    "type": "earthquake"
                }
                earthquakes.append(eq)
                
            return earthquakes
            
    except Exception as e:
        logger.error(f"Failed to fetch USGS data: {e}")
        return []
