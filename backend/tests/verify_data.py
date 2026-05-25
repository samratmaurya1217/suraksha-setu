import asyncio
import logging
from sqlalchemy import select
from database import AsyncSessionLocal, User, Alert, CommunityReport

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

async def verify_data():
    logger.info("🔍 Verifying Seeded Data...")
    
    async with AsyncSessionLocal() as db:
        # 1. Check Restrictions
        result = await db.execute(select(User))
        users = result.scalars().all()
        logger.info(f"👥 Users Found: {len(users)}")
        for u in users:
            logger.info(f"   - {u.username} ({u.user_type})")
        assert len(users) >= 5
        
        # 2. Check Alerts
        result = await db.execute(select(Alert))
        alerts = result.scalars().all()
        logger.info(f"🚨 Alerts Found: {len(alerts)}")
        for a in alerts:
            logger.info(f"   - [{a.severity.upper()}] {a.title} ({a.location['city']})")
        assert len(alerts) >= 4

        # 3. Check Reports
        result = await db.execute(select(CommunityReport))
        reports = result.scalars().all()
        logger.info(f"📝 Reports Found: {len(reports)}")
        for r in reports:
            logger.info(f"   - {r.title} (Upvotes: {r.upvotes})")
        assert len(reports) >= 2
        
    logger.info("✅ Data Verification Successful!")

if __name__ == "__main__":
    asyncio.run(verify_data())
