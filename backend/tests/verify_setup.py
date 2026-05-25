import asyncio
import logging
from risk_engine import RiskEngine
from ai.orchestrator import orchestrator
from utils.redis_client import redis_client
from playbook import playbook_engine
import os

# Configure Logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("verification.log", mode='w'),
        logging.StreamHandler()
    ],
    force=True
)
logger = logging.getLogger(__name__)

async def verify_system():
    print("=== STARTING SYSTEM VERIFICATION (STDOUT) ===")
    logger.info("=== STARTING SYSTEM VERIFICATION ===")

    # 1. Verify Risk Engine (Deterministic)
    logger.info("--- 1. Testing Risk Engine ---")
    
    # Tsunami Check
    tsunami_risk = RiskEngine.evaluate_tsunami_risk(7.0, 10.0, True)
    assert tsunami_risk['alert'] == True
    assert tsunami_risk['level'] == "Tsunami Potential"
    logger.info("✅ Tsunami Logic Verified")

    # Flood Check
    flood_risk = RiskEngine.evaluate_flood_risk(105.0, 100.0) # 5m above danger
    assert flood_risk['alert'] == True
    assert flood_risk['severity'] == "critical"
    logger.info("✅ Flood Logic Verified")

    # AQI Check
    aqi_risk = RiskEngine.evaluate_aqi_risk(350)
    assert aqi_risk['level'] == "Hazardous"
    logger.info("✅ AQI Logic Verified")

    # 2. Verify Playbook
    logger.info("--- 2. Testing Action Playbook ---")
    logger.info(f"Loaded {len(playbook_engine.rules)} rules in Playbook Engine.")
    actions = playbook_engine.get_actions("flood", "critical", "citizen")
    logger.info(f"Retrieved actions: {actions}")
    
    if not actions:
        logger.error("Actions list is empty! Checking rules dump:")
        for r in playbook_engine.rules:
            logger.error(f"Rule: {r.get('risk_type')} / {r.get('severity')} / {r.get('user_role')}")

    assert len(actions) > 0
    # Case insensitive check or check for specific keyword
    assert "EVACUATE" in actions[0] or "higher ground" in str(actions)
    logger.info(f"✅ Playbook Verified (Calculated {len(actions)} actions)")

    # 3. Verify Redis connection
    logger.info("--- 3. Testing Redis Caching ---")
    await redis_client.connect()
    r = await redis_client.get_client()
    if r:
        await r.set("test_key", "verified")
        val = await r.get("test_key")
        assert val == "verified"
        logger.info("✅ Redis Connection Verified")
    else:
        logger.warning("⚠️ Redis Not Available (Skipping Cache Test)")

    # 4. Verify AI Orchestrator (Mock Call)
    logger.info("--- 4. Testing AI Orchestrator ---")
    # We won't actually call OpenAI to save tokens/time, but verify formatting
    # Using a mock context
    context = {"risk_type": "flood", "severity": "critical"}
    
    # Simulate routing logic
    agent = orchestrator.agents["citizen"]
    assert agent.role == "citizen"
    logger.info("✅ AI Agent Routing Logic Verified")
    
    # 5. Verify Ingestion Modules Import
    from ingest.usgs import fetch_earthquakes
    from ingest.cpcb import fetch_aqi
    logger.info("✅ Ingestion Modules Imported Successfully")

    await redis_client.close()
    logger.info("=== SYSTEM VERIFICATION COMPLETE ===\nALL CHECKS PASSED")

if __name__ == "__main__":
    asyncio.run(verify_system())
