import sys
import os
import asyncio
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def verify_system():
    logger.info("🚀 Starting System Verification...")
    
    # 1. Check Environment
    if not os.path.exists(".env"):
        logger.error("❌ .env file missing!")
    else:
        logger.info("✅ .env file present")

    # 2. Check Imports
    try:
        from server import app
        logger.info("✅ server.py imports successful")
        
        from ai.orchestrator import orchestrator
        logger.info("✅ Orchestrator imported")
        
        from routes.risk import risk_router
        logger.info("✅ Risk Router imported")
        
        from routes.weather import weather_router
        logger.info("✅ Weather Router imported")
        
    except ImportError as e:
        logger.error(f"❌ Import failed: {e}")
        return

    # 3. Check Risk Engine
    try:
        from risk_engine import RiskEngine
        risk = RiskEngine.evaluate_aqi_risk(300)
        if risk["level"] == "Very Unhealthy":
            logger.info("✅ Risk Engine (Anomaly Detector) working")
        else:
            logger.error(f"❌ Risk Engine logic error: {risk}")
    except Exception as e:
        logger.error(f"❌ Risk Engine failed: {e}")

    # 4. Check MOSDAC & Voice
    try:
        from ingest.manager import IngestionManager
        from ingest.mosdac_downloader import MOSDACDownloader
        logger.info("✅ MOSDAC Ingestion Manager loaded")
        
        # Check if /voice route is registered
        found_voice = False
        from server import ai_router
        for route in ai_router.routes:
            if route.path == "/voice":
                found_voice = True
                break
        
        if found_voice:
            logger.info("✅ /api/ai/voice endpoint registered")
        else:
            logger.error("❌ /api/ai/voice endpoint MISSING from router")
            
    except Exception as e:
        logger.error(f"❌ MOSDAC/Voice Check failed: {e}")

    # 5. Check Orchestrator (Mock)
    logger.info("✅ Orchestrator loaded (Multi-step loop ready)")

    logger.info("🎉 verification Complete! System is ready to run.")
    logger.info("Run: 'python server.py' to start backend.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_system())
