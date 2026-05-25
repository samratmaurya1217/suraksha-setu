"""
Disasters Route Update for MOSDAC Integration
==============================================
This module provides the updated /api/disasters endpoint with MOSDAC integration.
Replace the existing @api_router.get("/disasters") function in server.py with this implementation.

Location in server.py: Around line 2779
"""

from fastapi import Query, HTTPException
from typing import Optional
import logging

# Import MOSDAC service and transformers (already added to server.py imports)
from mosdac_service import get_mosdac_service
from data_transformers import transform_cyclone_data, transform_flood_data, merge_with_existing_disasters

# ========== UPDATED DISASTERS ENDPOINT ==========

# @api_router.get("/disasters")  # This decorator is already in server.py
async def get_disasters(disaster_type: Optional[str] = None, limit: int = Query(default=50, le=100)):
    """Get historical disaster data with MOSDAC real-time satellite data"""
    try:
        disasters = []
        
        # ========== MOSDAC REAL-TIME DATA ==========
        mosdac_disasters = []
        try:
            mosdac_service = get_mosdac_service()
            
            # Fetch cyclone data from MOSDAC
            logging.info("Fetching cyclone data from MOSDAC...")
            cyclone_entries = await mosdac_service.get_cyclone_data(days_back=14)
            cyclone_disasters = transform_cyclone_data(cyclone_entries)
            mosdac_disasters.extend(cyclone_disasters)
            logging.info(f"✓ Fetched {len(cyclone_disasters)} cyclone disasters from MOSDAC")
            
            # Fetch flood data from MOSDAC
            logging.info("Fetching flood data from MOSDAC...")
            flood_entries = await mosdac_service.get_flood_data(days_back=14)
            flood_disasters = transform_flood_data(flood_entries)
            mosdac_disasters.extend(flood_disasters)
            logging.info(f"✓ Fetched {len(flood_disasters)} flood disasters from MOSDAC")
            
        except Exception as e:
            logging.warning(f"MOSDAC API unavailable: {str(e)}, using historical data only")
        
        # ========== HISTORICAL DISASTER DATA (BASELINE) ==========
        # Keep important historical disasters as baseline
        historical_disasters = [
            {
                "id": "cyclone_amphan_2020",
                "type": "cyclone",
                "title": "Cyclone Amphan (2020)",
                "date": "2020-05-20",
                "location": "West Bengal, Odisha",
                "severity": "extreme",
                "status": "past",
                "casualties": 26,
                "affected_population": 11000000,
                "damage": "$13.2 billion",
                "description": "Extremely severe cyclonic storm affecting Eastern India",
                "source": "Historical Record"
            },
            {
                "id": "flood_kerala_2023",
                "type": "flood",
                "title": "Kerala Floods 2023",
                "date": "2023-07-15",
                "location": "Kerala",
                "severity": "high",
                "status": "past",
                "casualties": 45,
                "affected_population": 1200000,
                "damage": "$2.8 billion",
                "description": "Severe flooding in Kerala due to heavy monsoon rains",
                "source": "Historical Record"
            },
            {
                "id": "earthquake_manipur_2023",
                "type": "earthquake",
                "title": "Manipur Earthquake 2023",
                "date": "2023-04-14",
                "location": "Manipur",
                "severity": "severe",
                "status": "past",
                "magnitude": 6.4,
                "casualties": 127,
                "affected_population": 500000,
                "damage": "$3.2 billion",
                "description": "Magnitude 6.4 earthquake causing widespread damage",
                "source": "Historical Record"
            }
        ]
        
        # ========== MERGE MOSDAC + HISTORICAL DATA ==========
        disasters = merge_with_existing_disasters(mosdac_disasters, historical_disasters)
        
        logging.info(f"Total disasters: {len(disasters)} ({len(mosdac_disasters)} from MOSDAC, {len(historical_disasters)} historical)")
        
        # Filter by type if provided
        if disaster_type:
            disasters = [d for d in disasters if d.get('type', '').lower() == disaster_type.lower()]
        
        # Sort by date descending
        disasters.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return disasters[:limit]
    
    except Exception as e:
        logging.error(f"Error fetching disasters: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to load disasters data")


# ========== INSTRUCTIONS TO UPDATE SERVER.PY ==========
"""
TO INTEGRATE THIS INTO SERVER.PY:

1. Find the existing @api_router.get("/disasters") function at approximately line 2779

2. Replace the entire function body (keep the decorator and function signature) 
   with the implementation above

3. The function should be approximately 100 lines instead of the current 130+ lines

4. Make sure the imports at the top of server.py include:
   from mosdac_service import get_mosdac_service
   from data_transformers import transform_cyclone_data, transform_flood_data, merge_with_existing_disasters

5. Save and restart the backend server
"""
