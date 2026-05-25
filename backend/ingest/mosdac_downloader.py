"""
MOSDAC Downloader
Layer 2: Event-based conditional downloads
Layer 3: Region-limited (bounding box filtering)
Only triggers when risk_score >= threshold or admin requests
"""
import asyncio
import logging
import os
from typing import Optional, Dict
from pathlib import Path
import aiohttp
from datetime import datetime

logger = logging.getLogger(__name__)

DOWNLOAD_URL = "https://mosdac.gov.in/download_api/download"
DOWNLOAD_PATH = Path(os.getenv("MOSDAC_DOWNLOAD_PATH", "./mosdac_data"))

class MOSDACDownloader:
    """
    Layer 2 & 3: Conditional, region-limited downloads.
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.daily_quota_used = 0
        self.daily_quota_limit = 5000
        
    async def download_product(
        self,
        product_id: str,
        identifier: str,
        bounding_box: Optional[Dict] = None,
        reason: str = "manual"
    ) -> Optional[str]:
        """
        Download a MOSDAC product (triggered by event or admin).
        
        Args:
            product_id: MOSDAC product ID
            identifier: Product filename
            bounding_box: Optional filter for region
            reason: Trigger reason ("risk_engine", "admin", "manual")
        
        Returns:
            File path if successful, None otherwise
        """
        if self.daily_quota_used >= self.daily_quota_limit:
            logger.warning(f"⚠️ Daily quota reached ({self.daily_quota_limit}). Skipping download.")
            return None
        
        logger.info(f"⬇️  Downloading {identifier} (Reason: {reason})")
        
        DOWNLOAD_PATH.mkdir(parents=True, exist_ok=True)
        file_path = DOWNLOAD_PATH / identifier
        
        # Check if already exists
        if file_path.exists():
            logger.info(f"✅ {identifier} already exists. Skipping.")
            return str(file_path)
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        params = {"id": product_id}
        
        # Add bounding box filter if provided (Layer 3)
        if bounding_box:
            params["boundingBox"] = bounding_box
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    DOWNLOAD_URL,
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status == 200:
                        total_size = int(response.headers.get('Content-Length', 0))
                        
                        with open(file_path, 'wb') as f:
                            async for chunk in response.content.iter_chunked(1048576):  # 1MB chunks
                                f.write(chunk)
                        
                        self.daily_quota_used += 1
                        logger.info(f"✅ Downloaded {identifier} ({total_size / (1024*1024):.2f} MB)")
                        logger.info(f"📊 Quota used: {self.daily_quota_used}/{self.daily_quota_limit}")
                        return str(file_path)
                    
                    elif response.status == 429:
                        resp_data = await response.json()
                        logger.warning(f"⚠️ Rate limit hit: {resp_data.get('message')}")
                        return None
                    
                    else:
                        logger.error(f"❌ Download failed: {response.status}")
                        return None
        
        except Exception as e:
            logger.error(f"❌ Download error: {e}")
            return None
    
    async def download_for_event(
        self,
        event_location: Dict,
        dataset_ids: list,
        radius_km: float = 50.0
    ) -> list:
        """
        Download products relevant to a disaster event (Layer 2 + 3).
        
        Args:
            event_location: {"lat": float, "lon": float}
            dataset_ids: List of MOSDAC dataset IDs to fetch
            radius_km: Radius around event to fetch data
        
        Returns:
            List of downloaded file paths
        """
        lat, lon = event_location["lat"], event_location["lon"]
        
        # Calculate bounding box from lat/lon + radius
        # Simplified: ~1 degree = 111km
        lat_offset = radius_km / 111.0
        lon_offset = radius_km / (111.0 * abs(lat))
        
        bbox_str = f"{lon - lon_offset},{lat - lat_offset},{lon + lon_offset},{lat + lat_offset}"
        
        logger.info(f"📍 Downloading for event at ({lat}, {lon}) with radius {radius_km}km")
        logger.info(f"🔲 Bounding Box: {bbox_str}")
        
        # Import here to avoid circular dependency
        from ingest.mosdac_metadata import metadata_poller
        
        downloaded_files = []
        
        for dataset_id in dataset_ids:
            # Poll metadata for this region
            metadata_records = await metadata_poller.poll_metadata(
                dataset_id=dataset_id,
                bounding_box=bbox_str
            )
            
            # Download only latest or most relevant
            for record in metadata_records[:3]:  # Limit to 3 per dataset
                file_path = await self.download_product(
                    product_id=record["product_id"],
                    identifier=record["identifier"],
                    bounding_box=bbox_str,
                    reason="risk_engine"
                )
                if file_path:
                    downloaded_files.append(file_path)
        
        return downloaded_files
