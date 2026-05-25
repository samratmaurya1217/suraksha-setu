"""
OpenAI Function-Callable Tools
Each tool exposes an OpenAI function schema + an execute() coroutine.
"""
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
#  TOOL SCHEMAS  (OpenAI function-calling format)
# ═══════════════════════════════════════════════════════════════

DB_QUERY_SCHEMA = {
    "name": "query_database",
    "description": "Query Suraksha Setu database for alerts, users, or community reports",
    "parameters": {
        "type": "object",
        "properties": {
            "table": {
                "type": "string",
                "enum": ["alerts", "users", "community_reports", "mosdac_metadata"],
                "description": "Table to query",
            },
            "filters": {
                "type": "object",
                "description": "Key-value filter conditions",
            },
            "limit": {"type": "integer", "description": "Max records", "default": 10},
        },
        "required": ["table"],
    },
}

NOTIFICATION_SCHEMA = {
    "name": "send_notification",
    "description": "Send a push notification or SMS to users in an affected area",
    "parameters": {
        "type": "object",
        "properties": {
            "message": {"type": "string", "description": "Notification body"},
            "severity": {
                "type": "string",
                "enum": ["info", "warning", "critical"],
            },
            "target_area": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lon": {"type": "number"},
                    "radius_km": {"type": "number"},
                },
            },
        },
        "required": ["message", "severity"],
    },
}

PLAYBOOK_SCHEMA = {
    "name": "get_playbook_actions",
    "description": "Retrieve official government SOP actions for a given disaster type, severity and user role",
    "parameters": {
        "type": "object",
        "properties": {
            "risk_type": {
                "type": "string",
                "enum": ["flood", "cyclone", "earthquake", "heatwave", "aqi",
                         "tsunami", "landslide", "cold_wave", "drought",
                         "industrial", "thunderstorm"],
            },
            "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
            "user_role": {"type": "string", "enum": ["citizen", "farmer", "student", "scientist"]},
        },
        "required": ["risk_type", "severity"],
    },
}

QUIZ_SCHEMA = {
    "name": "generate_quiz",
    "description": "Generate a structured quiz with multiple-choice questions for the student",
    "parameters": {
        "type": "object",
        "properties": {
            "topic": {"type": "string", "description": "Quiz topic (e.g. earthquake safety)"},
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Unique question ID like q1, q2"},
                        "question": {"type": "string"},
                        "options": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "4 options: A. ..., B. ..., C. ..., D. ...",
                        },
                        "answer": {"type": "string", "description": "Correct option letter (A/B/C/D)"},
                    },
                    "required": ["id", "question", "options", "answer"],
                },
                "description": "Array of 3 MCQ questions",
            },
        },
        "required": ["topic", "questions"],
    },
}

MOSDAC_DOWNLOAD_SCHEMA = {
    "name": "download_mosdac_data",
    "description": "Trigger MOSDAC satellite data download for a specific region and dataset",
    "parameters": {
        "type": "object",
        "properties": {
            "dataset_id": {"type": "string", "description": "MOSDAC dataset ID"},
            "lat": {"type": "number"},
            "lon": {"type": "number"},
            "radius_km": {"type": "number", "default": 50},
        },
        "required": ["dataset_id", "lat", "lon"],
    },
}

FLOOD_REPORT_SCHEMA = {
    "name": "generate_flood_report",
    "description": "Generate a structured flood risk report for a specific Indian region using MOSDAC satellite data (INSAT-3DR rainfall, SMAP soil moisture). Use this for queries like 'flood risk report for Kerala' or 'flood analysis for Bihar'.",
    "parameters": {
        "type": "object",
        "properties": {
            "region": {
                "type": "string",
                "description": "Indian region/state name (e.g., Kerala, Odisha, Mumbai, Bihar, Assam, Gujarat, Delhi, Chennai, West Bengal, Andhra Pradesh)",
            },
            "start_date": {
                "type": "string",
                "description": "Start date in YYYY-MM-DD format (optional, defaults to 30 days ago)",
            },
            "end_date": {
                "type": "string",
                "description": "End date in YYYY-MM-DD format (optional, defaults to today)",
            },
        },
        "required": ["region"],
    },
}

CYCLONE_REPORT_SCHEMA = {
    "name": "generate_cyclone_report",
    "description": "Generate a cyclone tracking report using MOSDAC satellite data (Scatsat wind vectors, SST). Use for cyclone-related queries.",
    "parameters": {
        "type": "object",
        "properties": {
            "region": {
                "type": "string",
                "description": "Ocean region (Bay of Bengal, Arabian Sea, or Indian Ocean)",
                "default": "Bay of Bengal",
            },
            "days_back": {
                "type": "integer",
                "description": "Number of days to analyze (default: 7)",
                "default": 7,
            },
        },
        "required": [],
    },
}

SATELLITE_SEARCH_SCHEMA = {
    "name": "search_satellite_data",
    "description": "Search MOSDAC satellite data by satellite name (INSAT-3D, INSAT-3DR, Scatsat, SMAP), region, and date range. Use for queries like 'INSAT-3D cyclone data' or 'satellite imagery for Odisha'.",
    "parameters": {
        "type": "object",
        "properties": {
            "satellite": {
                "type": "string",
                "description": "Satellite name: INSAT-3D, INSAT-3DR, Scatsat, SMAP, Oceansat",
            },
            "dataset_id": {
                "type": "string",
                "description": "Specific MOSDAC dataset ID (e.g., 3RIMG_L2B_RAIN, 3SCAT_L2B). Optional if satellite is provided.",
            },
            "region": {
                "type": "string",
                "description": "Indian region or state name (optional)",
            },
            "start_date": {
                "type": "string",
                "description": "Start date YYYY-MM-DD (optional)",
            },
            "end_date": {
                "type": "string",
                "description": "End date YYYY-MM-DD (optional)",
            },
        },
        "required": [],
    },
}

PUBLISH_ADVISORY_SCHEMA = {
    "name": "publish_advisory",
    "description": "Structured advisory for alert publication. Used by researcher and admin agents.",
    "parameters": {
        "type": "object",
        "properties": {
            "advisory_en": {"type": "string", "description": "Advisory text in English"},
            "advisory_hi": {"type": "string", "description": "Advisory text in Hindi (optional)"},
            "actions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of recommended actions from government guidelines",
            },
            "confidence": {
                "type": "number",
                "description": "Confidence score 0.0-1.0 based on data quality and source reliability",
            },
            "sources": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Source citations for the advisory (e.g. NDMA, IMD, CPCB)",
            },
        },
        "required": ["advisory_en", "confidence"],
    },
}

# All schemas in one list for convenience
ALL_TOOL_SCHEMAS = [
    DB_QUERY_SCHEMA,
    NOTIFICATION_SCHEMA,
    PLAYBOOK_SCHEMA,
    QUIZ_SCHEMA,
    MOSDAC_DOWNLOAD_SCHEMA,
    FLOOD_REPORT_SCHEMA,
    CYCLONE_REPORT_SCHEMA,
    SATELLITE_SEARCH_SCHEMA,
    PUBLISH_ADVISORY_SCHEMA,
]


# ═══════════════════════════════════════════════════════════════
#  TOOL EXECUTORS
# ═══════════════════════════════════════════════════════════════

async def execute_query_database(table: str, filters: dict = None, limit: int = 10) -> Dict:
    """Execute a database query tool call."""
    from database import AsyncSessionLocal, Alert, User, CommunityReport, MOSDACMetadata
    from sqlalchemy import select

    table_map = {
        "alerts": Alert,
        "users": User,
        "community_reports": CommunityReport,
        "mosdac_metadata": MOSDACMetadata,
    }
    model_cls = table_map.get(table)
    if not model_cls:
        return {"error": f"Unknown table: {table}"}

    try:
        async with AsyncSessionLocal() as db:
            query = select(model_cls).limit(limit)
            result = await db.execute(query)
            rows = result.scalars().all()
            return {
                "table": table,
                "count": len(rows),
                "records": [
                    {c.name: str(getattr(r, c.name, ""))
                     for c in model_cls.__table__.columns
                     if c.name not in ("geom",)}
                    for r in rows
                ],
            }
    except Exception as e:
        logger.error(f"DB query tool error: {e}")
        return {"error": str(e)}


async def execute_send_notification(message: str, severity: str, target_area: dict = None) -> Dict:
    """Execute a notification tool call."""
    from notifications import ws_manager, push_manager

    payload = {"title": f"Suraksha Setu [{severity.upper()}]", "body": message}
    try:
        push_count = await push_manager.broadcast_notification(payload)
        await ws_manager.broadcast({"type": "alert", "severity": severity, "message": message})
        return {"sent_push": push_count, "sent_ws": True}
    except Exception as e:
        logger.error(f"Notification tool error: {e}")
        return {"error": str(e)}


async def execute_get_playbook_actions(risk_type: str, severity: str, user_role: str = "citizen") -> Dict:
    """Execute playbook retriever."""
    from playbook import playbook_engine

    actions = playbook_engine.get_actions(risk_type, severity, user_role)
    return {"risk_type": risk_type, "severity": severity, "role": user_role, "actions": actions}


async def execute_download_mosdac_data(dataset_id: str, lat: float, lon: float, radius_km: float = 50) -> Dict:
    """Trigger MOSDAC download."""
    try:
        from mosdac_service import get_mosdac_service
        service = get_mosdac_service()
        await service.authenticate()
        entries = await service.search_datasets(
            dataset_id=dataset_id,
            bounding_box=f"{lon - 1},{lat - 1},{lon + 1},{lat + 1}",
            limit=10,
        )
        return {"dataset_id": dataset_id, "entries": len(entries), "status": "ok"}
    except Exception as e:
        logger.error(f"MOSDAC download error: {e}")
        return {"error": str(e)}


async def execute_generate_quiz(topic: str, questions: list = None) -> Dict:
    """Execute quiz generation tool — returns structured MCQ data."""
    if questions:
        # LLM already generated structured quiz via function calling
        return {
            "topic": topic,
            "questions": questions,
            "count": len(questions),
        }
    # Fallback: return a template
    return {
        "topic": topic,
        "questions": [],
        "message": "Quiz generated by LLM function call.",
    }


async def execute_publish_advisory(
    advisory_en: str,
    confidence: float,
    advisory_hi: str = None,
    actions: list = None,
    sources: list = None,
) -> Dict:
    """Publish a structured advisory."""
    # Only publish if confidence is reasonably high
    should_publish = confidence >= 0.5
    requires_review = confidence < 0.8

    return {
        "published": should_publish,
        "requires_review": requires_review,
        "advisory": {
            "en": advisory_en,
            "hi": advisory_hi,
            "actions": actions or [],
            "confidence": confidence,
            "sources": sources or [],
        },
    }


async def execute_generate_flood_report(
    region: str, start_date: str = None, end_date: str = None
) -> Dict:
    """Generate a flood risk report using MOSDAC satellite data."""
    try:
        from ingest.mosdac_poller import report_generator
        report = await report_generator.generate_flood_report(
            region=region, start_date=start_date, end_date=end_date
        )
        return report
    except Exception as e:
        logger.error(f"Flood report tool error: {e}")
        return {"error": str(e), "title": f"Flood Risk Report — {region}", "status": "failed"}


async def execute_generate_cyclone_report(
    region: str = "Bay of Bengal", days_back: int = 7
) -> Dict:
    """Generate a cyclone tracking report using MOSDAC satellite data."""
    try:
        from ingest.mosdac_poller import report_generator
        report = await report_generator.generate_cyclone_report(
            region=region, days_back=days_back
        )
        return report
    except Exception as e:
        logger.error(f"Cyclone report tool error: {e}")
        return {"error": str(e), "title": f"Cyclone Report — {region}", "status": "failed"}


async def execute_search_satellite_data(
    satellite: str = None, dataset_id: str = None,
    region: str = None, start_date: str = None, end_date: str = None
) -> Dict:
    """Search MOSDAC satellite data by satellite name, region, and date."""
    try:
        from ingest.mosdac_poller import report_generator
        result = await report_generator.search_satellite_data(
            dataset_id=dataset_id or "",
            satellite=satellite,
            region=region,
            start_date=start_date,
            end_date=end_date,
        )
        return result
    except Exception as e:
        logger.error(f"Satellite search tool error: {e}")
        return {"error": str(e), "satellite": satellite, "status": "failed"}


# ═══════════════════════════════════════════════════════════════
#  DISPATCH MAP
# ═══════════════════════════════════════════════════════════════
TOOL_EXECUTORS = {
    "query_database": execute_query_database,
    "send_notification": execute_send_notification,
    "get_playbook_actions": execute_get_playbook_actions,
    "generate_quiz": execute_generate_quiz,
    "download_mosdac_data": execute_download_mosdac_data,
    "generate_flood_report": execute_generate_flood_report,
    "generate_cyclone_report": execute_generate_cyclone_report,
    "search_satellite_data": execute_search_satellite_data,
    "publish_advisory": execute_publish_advisory,
}
