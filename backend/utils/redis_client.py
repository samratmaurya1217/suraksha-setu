import redis.asyncio as redis
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class RedisClient:
    def __init__(self):
        self.redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        self.client: Optional[redis.Redis] = None

    async def connect(self):
        """Initialize Redis Connection"""
        try:
            self.client = redis.from_url(
                self.redis_url, 
                encoding="utf-8", 
                decode_responses=True
            )
            ping = await self.client.ping()
            if ping:
                logger.info("Redis Connected Successfully")
        except Exception as e:
            logger.warning(f"Redis Connection Failed: {e}")
            self.client = None

    async def close(self):
        """Close Redis Connection"""
        if self.client:
            await self.client.close()
            logger.info("Redis Connection Closed")

    async def get_client(self) -> redis.Redis:
        if not self.client:
            await self.connect()
        return self.client

# Singleton
redis_client = RedisClient()
