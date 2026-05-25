import httpx
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Fallback to OpenWeather if CPCB API not available (Hackathon standard)
OWM_AQI_URL = "http://api.openweathermap.org/data/2.5/air_pollution"

async def fetch_aqi(lat: float, lon: float):
    """
    Fetch AQI data for a specific location.
    """
    api_key = os.environ.get("OPENWEATHER_API_KEY")
    if not api_key:
        logger.warning("OPENWEATHER_API_KEY not set. Skipping AQI fetch.")
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": api_key
            }
            response = await client.get(OWM_AQI_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data.get('list'):
                return None
                
            item = data['list'][0]
            components = item.get('components', {})
            aqi_index = item.get('main', {}).get('aqi') # 1-5 scale
            
            # Convert 1-5 to approx US AQI for standardization
            aqi_map = {1: 40, 2: 80, 3: 120, 4: 170, 5: 250}
            standard_aqi = aqi_map.get(aqi_index, 100)
            
            return {
                "aqi": standard_aqi,
                "pm25": components.get('pm2_5'),
                "pm10": components.get('pm10'),
                "no2": components.get('no2'),
                "timestamp": datetime.fromtimestamp(item.get('dt'), tz=timezone.utc)
            }

    except Exception as e:
        logger.error(f"Failed to fetch AQI for {lat},{lon}: {e}")
        return None
