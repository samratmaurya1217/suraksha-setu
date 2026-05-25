"""
MOSDAC API Service
==================
Production-grade integration with MOSDAC (Meteorological and Oceanographic Satellite Data Archival Centre)
for real-time satellite and meteorological data.

Features:
- Token-based authentication with auto-refresh
- Dataset search and retrieval
- Cyclone tracking data
- Flood monitoring data  
- Weather satellite data
- Error handling and retry logic
- Response caching for performance
"""

import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from cachetools import TTLCache

# MOSDAC API Endpoints
TOKEN_URL = "https://mosdac.gov.in/download_api/gettoken"
SEARCH_URL = "https://mosdac.gov.in/apios/datasets.json"
CHECK_INTERNET_URL = "https://mosdac.gov.in/download_api/check-internet"
DOWNLOAD_URL = "https://mosdac.gov.in/download_api/download"
REFRESH_URL = "https://mosdac.gov.in/download_api/refresh-token"
LOGOUT_URL = "https://mosdac.gov.in/download_api/logout"

logger = logging.getLogger(__name__)


class MOSDACService:
    """MOSDAC API client with authentication, caching, and error handling"""
    
    def __init__(self):
        self.username = os.getenv("MOSDAC_USERNAME", "")
        self.password = os.getenv("MOSDAC_PASSWORD", "")
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        
        # Cache for API responses (1 hour TTL)
        cache_ttl = int(os.getenv("MOSDAC_CACHE_TTL", "3600"))
        self.cache = TTLCache(maxsize=100, ttl=cache_ttl)
        
        if not self.username or not self.password:
            logger.warning("MOSDAC credentials not configured. Service will operate in fallback mode.")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPError)
    )
    async def authenticate(self) -> str:
        """
        Authenticate with MOSDAC API and get access token
        
        Returns:
            Access token string
            
        Raises:
            Exception if authentication fails
        """
        if not self.username or not self.password:
            raise ValueError("MOSDAC credentials not configured")
        
        # Check if token is still valid
        if self.access_token and self.token_expiry:
            if datetime.now(timezone.utc) < self.token_expiry:
                logger.info("Using cached MOSDAC token")
                return self.access_token
        
        logger.info(f"Authenticating with MOSDAC as {self.username}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    TOKEN_URL,
                    json={
                        "username": self.username,
                        "password": self.password
                    }
                )
                
                if response.status_code == 503:
                    error_msg = response.json().get("message", "Service Unavailable")
                    logger.error(f"MOSDAC service unavailable: {error_msg}")
                    raise Exception(f"MOSDAC service unavailable: {error_msg}")
                
                if response.status_code == 400:
                    error_data = response.json()
                    error_msg = error_data.get("error", "Validation error")
                    logger.error(f"MOSDAC validation error: {error_msg}")
                    raise Exception(f"MOSDAC validation error: {error_msg}")
                
                if response.status_code == 401:
                    error_data = response.json()
                    error_msg = error_data.get("error", "Invalid credentials")
                    logger.error(f"MOSDAC authentication failed: {error_msg}")
                    raise Exception(f"MOSDAC authentication failed: {error_msg}")
                
                response.raise_for_status()
                
                token_data = response.json()
                self.access_token = token_data.get("access_token")
                self.refresh_token = token_data.get("refresh_token")
                
                # Set token expiry (assume 24 hours if not provided)
                self.token_expiry = datetime.now(timezone.utc) + timedelta(hours=23)
                
                logger.info("✓ MOSDAC authentication successful")
                return self.access_token
                
            except httpx.HTTPError as e:
                logger.error(f"HTTP error during MOSDAC authentication: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error during MOSDAC authentication: {str(e)}")
                raise
    
    async def refresh_access_token(self) -> str:
        """Refresh the access token using refresh token"""
        if not self.refresh_token:
            logger.warning("No refresh token available, re-authenticating")
            return await self.authenticate()
        
        logger.info("Refreshing MOSDAC access token")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    REFRESH_URL,
                    json={"refresh_token": self.refresh_token}
                )
                
                response.raise_for_status()
                token_data = response.json()
                
                self.access_token = token_data.get("access_token")
                self.refresh_token = token_data.get("refresh_token")
                self.token_expiry = datetime.now(timezone.utc) + timedelta(hours=23)
                
                logger.info("✓ Token refreshed successfully")
                return self.access_token
                
            except Exception as e:
                logger.error(f"Token refresh failed: {str(e)}, re-authenticating")
                return await self.authenticate()
    
    async def search_datasets(
        self,
        dataset_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        bounding_box: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Search MOSDAC datasets
        
        Args:
            dataset_id: Dataset identifier (e.g., "3RIMG_L2B_SST")
            start_time: Start time in YYYY-MM-DD format
            end_time: End time in YYYY-MM-DD format
            bounding_box: Geographic bounding box
            limit: Maximum number of results
            
        Returns:
            List of dataset entries
        """
        cache_key = f"search_{dataset_id}_{start_time}_{end_time}_{limit}"
        
        if cache_key in self.cache:
            logger.info(f"Returning cached search results for {dataset_id}")
            return self.cache[cache_key]
        
        logger.info(f"Searching MOSDAC datasets: {dataset_id}")
        
        params = {"datasetId": dataset_id}
        
        if start_time:
            params["startTime"] = start_time
        if end_time:
            params["endTime"] = end_time
        if bounding_box:
            params["boundingBox"] = bounding_box
        if limit:
            params["count"] = str(limit)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.get(SEARCH_URL, params=params)
                response.raise_for_status()
                
                data = response.json()
                entries = data.get("entries", [])
                
                logger.info(f"✓ Found {len(entries)} entries for {dataset_id}")
                
                # Cache results
                self.cache[cache_key] = entries
                
                return entries
                
            except Exception as e:
                logger.error(f"Error searching datasets: {str(e)}")
                return []
    
    async def get_cyclone_data(self, days_back: int = 7) -> List[Dict[str, Any]]:
        """
        Get cyclone tracking data from MOSDAC
        
        Args:
            days_back: Number of days to look back
            
        Returns:
            List of cyclone data entries
        """
        cache_key = f"cyclone_data_{days_back}"
        
        if cache_key in self.cache:
            logger.info("Returning cached cyclone data")
            return self.cache[cache_key]
        
        logger.info(f"Fetching cyclone data from MOSDAC (last {days_back} days)")
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # MOSDAC cyclone datasets
        cyclone_datasets = [
            "3SCAT_L2B",  # Scatterometer data for wind analysis
            "3RIMG_L1B",  # Satellite imagery
        ]
        
        all_cyclone_data = []
        
        try:
            await self.authenticate()
            
            for dataset_id in cyclone_datasets:
                entries = await self.search_datasets(
                    dataset_id=dataset_id,
                    start_time=start_date.strftime("%Y-%m-%d"),
                    end_time=end_date.strftime("%Y-%m-%d"),
                    limit=50
                )
                all_cyclone_data.extend(entries)
            
            logger.info(f"✓ Retrieved {len(all_cyclone_data)} cyclone data entries")
            
            # Cache results
            self.cache[cache_key] = all_cyclone_data
            
            return all_cyclone_data
            
        except Exception as e:
            logger.error(f"Error fetching cyclone data: {str(e)}")
            return []
    
    async def get_flood_data(self, days_back: int = 7) -> List[Dict[str, Any]]:
        """
        Get flood monitoring data from MOSDAC
        
        Args:
            days_back: Number of days to look back
            
        Returns:
            List of flood monitoring data
        """
        cache_key = f"flood_data_{days_back}"
        
        if cache_key in self.cache:
            logger.info("Returning cached flood data")
            return self.cache[cache_key]
        
        logger.info(f"Fetching flood data from MOSDAC (last {days_back} days)")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # MOSDAC flood monitoring datasets
        flood_datasets = [
            "3RIMG_L2B_RAIN",  # Rainfall estimates
            "3SMAP_L3_SM",     # Soil moisture
        ]
        
        all_flood_data = []
        
        try:
            await self.authenticate()
            
            for dataset_id in flood_datasets:
                entries = await self.search_datasets(
                    dataset_id=dataset_id,
                    start_time=start_date.strftime("%Y-%m-%d"),
                    end_time=end_date.strftime("%Y-%m-%d"),
                    limit=50
                )
                all_flood_data.extend(entries)
            
            logger.info(f"✓ Retrieved {len(all_flood_data)} flood data entries")
            
            # Cache results
            self.cache[cache_key] = all_flood_data
            
            return all_flood_data
            
        except Exception as e:
            logger.error(f"Error fetching flood data: {str(e)}")
            return []
    
    async def get_weather_satellite_data(
        self,
        lat: float,
        lon: float,
        days_back: int = 1
    ) -> Dict[str, Any]:
        """
        Get weather satellite data for a specific location
        
        Args:
            lat: Latitude
            lon: Longitude
            days_back: Number of days to look back
            
        Returns:
            Weather satellite data
        """
        cache_key = f"weather_{lat}_{lon}_{days_back}"
        
        if cache_key in self.cache:
            logger.info(f"Returning cached weather data for {lat}, {lon}")
            return self.cache[cache_key]
        
        logger.info(f"Fetching weather satellite data for {lat}, {lon}")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Create bounding box around the point (±1 degree)
        bbox = f"{lon-1},{lat-1},{lon+1},{lat+1}"
        
        try:
            await self.authenticate()
            
            # SST (Sea Surface Temperature) data
            entries = await self.search_datasets(
                dataset_id="3RIMG_L2B_SST",
                start_time=start_date.strftime("%Y-%m-%d"),
                end_time=end_date.strftime("%Y-%m-%d"),
                bounding_box=bbox,
                limit=10
            )
            
            weather_data = {
                "location": {"lat": lat, "lon": lon},
                "entries": entries,
                "count": len(entries),
                "source": "mosdac"
            }
            
            # Cache results
            self.cache[cache_key] = weather_data
            
            return weather_data
            
        except Exception as e:
            logger.error(f"Error fetching weather data: {str(e)}")
            return {
                "location": {"lat": lat, "lon": lon},
                "entries": [],
                "count": 0,
                "source": "error",
                "error": str(e)
            }
    
    async def logout(self):
        """Logout from MOSDAC API"""
        if not self.username:
            return
        
        logger.info(f"Logging out from MOSDAC (user: {self.username})")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(
                    LOGOUT_URL,
                    json={"username": self.username}
                )
                response.raise_for_status()
                
                # Clear tokens
                self.access_token = None
                self.refresh_token = None
                self.token_expiry = None
                
                logger.info("✓ Logout successful")
                
            except Exception as e:
                logger.error(f"Logout error: {str(e)}")


# Singleton instance
_mosdac_service: Optional[MOSDACService] = None


def get_mosdac_service() -> MOSDACService:
    """Get or create MOSDAC service singleton"""
    global _mosdac_service
    if _mosdac_service is None:
        _mosdac_service = MOSDACService()
    return _mosdac_service
