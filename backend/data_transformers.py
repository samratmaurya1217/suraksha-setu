"""
Data Transformers for MOSDAC API
=================================
Transform MOSDAC API responses into Suraksha-Setu format
"""

from typing import List, Dict, Any
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)


def transform_cyclone_data(mosdac_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform MOSDAC cyclone data to Suraksha-Setu disaster format
    
    Args:
        mosdac_entries: Raw MOSDAC API entries
        
    Returns:
        List of disasters in Suraksha-Setu format
    """
    disasters = []
    
    for entry in mosdac_entries:
        try:
            # Extract metadata
            identifier = entry.get("identifier", "")
            updated = entry.get("updated", "")
            title = entry.get("title", "Cyclone Alert")
            
            # Parse date
            try:
                date_obj = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                date_str = date_obj.strftime("%Y-%m-%d")
            except:
                date_str = datetime.now().strftime("%Y-%m-%d")
            
            # Extract location if available
            location = "Indian Ocean"
            coordinates = None
            
            if "spatial" in entry:
                spatial = entry["spatial"]
                if isinstance(spatial, dict):
                    lat = spatial.get("lat")
                    lon = spatial.get("lon")
                    if lat and lon:
                        coordinates = {"lat": float(lat), "lon": float(lon)}
                        location = f"{lat}°N, {lon}°E"
            
            disaster = {
                "id": f"mosdac_cyclone_{identifier}",
                "type": "cyclone",
                "title": title,
                "description": f"Cyclone activity detected via satellite imagery. Data ID: {identifier}",
                "location": location,
                "date": date_str,
                "severity": "high",  # Cyclones are high severity
                "status": "active" if (datetime.now() - date_obj).days < 3 else "past",
                "affected_population": 0,  # Not available from satellite data
                "casualties": 0,  # Not available from satellite data
                "source": "MOSDAC",
                "mosdac_id": identifier,
                "updated": updated
            }
            
            if coordinates:
                disaster["coordinates"] = coordinates
            
            disasters.append(disaster)
            
        except Exception as e:
            logger.error(f"Error transforming cyclone entry: {str(e)}")
            continue
    
    logger.info(f"Transformed {len(disasters)} cyclone disasters from MOSDAC data")
    return disasters


def transform_flood_data(mosdac_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform MOSDAC flood/rainfall data to Suraksha-Setu disaster format
    
    Args:
        mosdac_entries: Raw MOSDAC API entries
        
    Returns:
        List of disasters in Suraksha-Setu format
    """
    disasters = []
    
    for entry in mosdac_entries:
        try:
            identifier = entry.get("identifier", "")
            updated = entry.get("updated", "")
            title = entry.get("title", "Flood Alert")
            
            # Parse date
            try:
                date_obj = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                date_str = date_obj.strftime("%Y-%m-%d")
            except:
                date_str = datetime.now().strftime("%Y-%m-%d")
            
            # Extract location
            location = "India"
            coordinates = None
            
            if "spatial" in entry:
                spatial = entry["spatial"]
                if isinstance(spatial, dict):
                    lat = spatial.get("lat")
                    lon = spatial.get("lon")
                    if lat and lon:
                        coordinates = {"lat": float(lat), "lon": float(lon)}
                        location = f"{lat}°N, {lon}°E"
            
            disaster = {
                "id": "mosdac_flood_{identifier}",
                "type": "flood",
                "title": title,
                "description": f"Heavy rainfall detected via satellite. Data ID: {identifier}",
                "location": location,
                "date": date_str,
                "severity": "medium",
                "status": "active" if (datetime.now() - date_obj).days < 5 else "past",
                "affected_population": 0,
                "casualties": 0,
                "source": "MOSDAC",
                "mosdac_id": identifier,
                "updated": updated
            }
            
            if coordinates:
                disaster["coordinates"] = coordinates
            
            disasters.append(disaster)
            
        except Exception as e:
            logger.error(f"Error transforming flood entry: {str(e)}")
            continue
    
    logger.info(f"Transformed {len(disasters)} flood disasters from MOSDAC data")
    return disasters


def transform_weather_data(mosdac_data: Dict[str, Any], location: str) -> Dict[str, Any]:
    """
    Transform MOSDAC weather satellite data to Suraksha-Setu format
    
    Args:
        mosdac_data: Raw MOSDAC weather data
        location: Location name
        
    Returns:
        Weather data in Suraksha-Setu format
    """
    entries = mosdac_data.get("entries", [])
    
    if not entries:
        return {
            "current": {
                "location": location,
                "temperature": None,
                "condition": "Unknown",
                "source": "mosdac",
                "available": False
            },
            "message": "No satellite data available for this location"
        }
    
    # Use the most recent entry
    latest_entry = entries[0]
    
    return {
        "current": {
            "location": location,
            "temperature": None,  # SST data, not air temperature
            "condition": "Satellite data available",
            "source": "mosdac",
            "available": True,
            "satellite_data": {
                "identifier": latest_entry.get("identifier"),
                "updated": latest_entry.get("updated"),
                "title": latest_entry.get("title")
            }
        },
        "entries_count": len(entries),
        "message": f"Weather satellite data available ({len(entries)} entries)"
    }


def merge_with_existing_disasters(
    mosdac_disasters: List[Dict[str, Any]],
    existing_disasters: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Merge MOSDAC disasters with existing disaster data
    
    Args:
        mosdac_disasters: Disasters from MOSDAC API
        existing_disasters: Existing disasters from other sources
        
    Returns:
        Merged disaster list without duplicates
    """
    # Create a set of existing disaster IDs
    existing_ids = {d.get("id") for d in existing_disasters}
    
    # Add MOSDAC disasters that don't exist
    merged = existing_disasters.copy()
    
    for disaster in mosdac_disasters:
        if disaster.get("id") not in existing_ids:
            merged.append(disaster)
    
    # Sort by date (most recent first)
    merged.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    logger.info(f"Merged disasters: {len(existing_disasters)} existing + {len(mosdac_disasters)} from MOSDAC = {len(merged)} total")
    
    return merged


def create_alert_from_disaster(disaster: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a MOSDAC disaster into an alert format
    
    Args:
        disaster: Disaster data
        
    Returns:
        Alert in Suraksha-Setu format
    """
    severity_map = {
        "low": "info",
        "medium": "warning",
        "high": "critical",
        "extreme": "critical"
    }
    
    return {
        "id": f"alert_{disaster.get('id')}",
        "type": disaster.get("type", "disaster"),
        "severity": severity_map.get(disaster.get("severity", "medium"), "warning"),
        "title": disaster.get("title", "Disaster Alert"),
        "message": disaster.get("description", ""),
        "location": disaster.get("location", "Unknown"),
        "coordinates": disaster.get("coordinates"),
        "timestamp": disaster.get("updated", datetime.now().isoformat()),
        "source": disaster.get("source", "MOSDAC"),
        "active": disaster.get("status") == "active",
        "disaster_id": disaster.get("id")
    }
