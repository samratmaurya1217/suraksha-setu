"""
RAG System – Scientist Portal
ChromaDB-based semantic search for disaster-management research documents.
"""
import os
import logging
import hashlib
from typing import List, Dict, Any, Optional
from pathlib import Path

from ai.openai_client import ai_client

logger = logging.getLogger(__name__)

# In-memory vector store (lightweight, works without external DB)
# Upgrade to ChromaDB / Pinecone for production scale
_VECTOR_STORE: List[Dict[str, Any]] = []

# ─── Pre-loaded knowledge base ────────────────────────────
KNOWLEDGE_BASE = [
    {
        "id": "sop_flood",
        "title": "NDMA Flood Management SOP",
        "content": (
            "National Disaster Management Authority guidelines for flood management:\n"
            "1. Early Warning: Monitor CWC flood bulletins every 3 hours\n"
            "2. Preparedness: Pre-position NDRF teams in vulnerable districts\n"
            "3. Evacuation: Begin when water level crosses HFL by 0.5m\n"
            "4. Relief: Deploy mobile medical units within 6 hours\n"
            "5. Recovery: Damage assessment within 48 hours of recession"
        ),
    },
    {
        "id": "sop_cyclone",
        "title": "IMD Cyclone Warning Protocol",
        "content": (
            "India Meteorological Department cyclone warning stages:\n"
            "1. Pre-Cyclone Watch: 72 hours before expected landfall\n"
            "2. Cyclone Alert: 48 hours – orange bulletin\n"
            "3. Cyclone Warning: 24 hours – red bulletin\n"
            "4. Post-Landfall Outlook: 12 hours after landfall\n"
            "Wind categories: CS (34-47kt), SCS (48-63kt), VSCS (64-89kt), ESCS (90-119kt), SuCS (≥120kt)"
        ),
    },
    {
        "id": "sop_earthquake",
        "title": "NDMA Earthquake Response Guidelines",
        "content": (
            "NDMA earthquake response protocol:\n"
            "1. Seismic Zone Mapping: India divided into zones II–V\n"
            "2. Intensity ≥ 5.0M: Activate District EOC within 30 min\n"
            "3. Intensity ≥ 6.5M: Deploy NDRF, Armed Forces standby\n"
            "4. Search & Rescue: Golden hour doctrine – first 72 hours critical\n"
            "5. Structural Assessment: Rapid Visual Screening within 7 days"
        ),
    },
    {
        "id": "sop_aqi",
        "title": "CPCB Air Quality Emergency Plan (GRAP)",
        "content": (
            "Graded Response Action Plan for Delhi-NCR:\n"
            "Stage I  (AQI 201-300): Advisory, dust control, ban firecrackers\n"
            "Stage II (AQI 301-400): Ban diesel gen-sets, restrict construction\n"
            "Stage III(AQI 401-450): Ban non-BS-VI diesel cars, school closures optional\n"
            "Stage IV (AQI > 450): Emergency, ban all non-essential vehicles, 50% WFH"
        ),
    },
    {
        "id": "mosdac_guide",
        "title": "MOSDAC Satellite Data Usage Guide",
        "content": (
            "MOSDAC (Meteorological and Oceanographic Satellite Data Archival Centre):\n"
            "Provides INSAT-3D, INSAT-3DR, Oceansat, Scatsat products.\n"
            "Key datasets: 3RIMG_MER (visible), 3DPCR (precipitation), OC2_SST (sea surface temp)\n"
            "API quota: 5000 requests/day\n"
            "Resolution: 1km (vis/IR), 4km (water vapour)\n"
            "Temporal: Every 15 min (INSAT-3DR rapid scan)"
        ),
    },
    {
        "id": "india_disaster_stats",
        "title": "India Disaster Statistics",
        "content": (
            "India experiences frequent natural disasters:\n"
            "- 68% land susceptible to drought\n"
            "- 12% land prone to flooding\n"
            "- 7516 km coastline vulnerable to cyclones\n"
            "- Zone V (highest seismic): NE India, J&K, parts of Uttarakhand\n"
            "- Average 5-6 tropical cyclones per year in Bay of Bengal\n"
            "- NDRF: 16 battalions, ~25,000 trained responders\n"
            "- Avg annual loss to natural disasters: ₹30,000-40,000 crore"
        ),
    },
]


class RAGSystem:
    """
    Simple in-memory vector RAG for the hackathon.
    Uses OpenAI embeddings for search; pre-loads KNOWLEDGE_BASE.
    """

    def __init__(self):
        self._initialised = False

    async def initialise(self):
        """Generate embeddings for the knowledge base (runs once)."""
        if self._initialised:
            return
        global _VECTOR_STORE

        texts = [doc["content"] for doc in KNOWLEDGE_BASE]
        result = await ai_client.get_embeddings(texts)

        if result.get("error") or not result.get("embeddings"):
            logger.warning(f"RAG init failed: {result.get('error')}")
            self._initialised = True  # don't retry every call
            return

        _VECTOR_STORE = []
        for doc, vec in zip(KNOWLEDGE_BASE, result["embeddings"]):
            _VECTOR_STORE.append({**doc, "embedding": vec})

        self._initialised = True
        logger.info(f"📚 RAG initialised with {len(_VECTOR_STORE)} documents")

    async def retrieve(
        self, query: str, top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """Semantic search: embed query → cosine similarity → top-k chunks."""
        await self.initialise()

        if not _VECTOR_STORE:
            return []

        result = await ai_client.get_embeddings([query])
        if result.get("error") or not result.get("embeddings"):
            return []

        q_vec = result["embeddings"][0]

        scored = []
        for doc in _VECTOR_STORE:
            sim = _cosine_sim(q_vec, doc["embedding"])
            scored.append((sim, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {"id": d["id"], "title": d["title"], "content": d["content"], "score": round(s, 4)}
            for s, d in scored[:top_k]
        ]


def _cosine_sim(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


# ── Singleton ──────────────────────────────────────────────
rag_system = RAGSystem()
