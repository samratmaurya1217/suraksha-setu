import os
import logging
import mimetypes
from typing import Dict, Any, Optional
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)


class SarvamClient:
    """
    Sarvam AI client.
    - LLM (chat): https://api.sarvam.ai/v1/chat/completions  (OpenAI-compatible)
    - STT:        https://api.sarvam.ai/speech-to-text
    - TTS:        https://api.sarvam.ai/text-to-speech
    - Translate:  https://api.sarvam.ai/translate
    """

    def __init__(self):
        self.api_key = os.getenv("SARVAM_API_KEY")
        # LLM endpoint base (v1 for OpenAI-compatible)
        self.llm_base = os.getenv("SARVAM_API_BASE_URL", "https://api.sarvam.ai/v1").rstrip("/")
        # Pipeline endpoint base (no /v1 — STT, TTS, translate live here)
        self.api_base = "https://api.sarvam.ai"
        self.model_text = os.getenv("SARVAM_MODEL_TEXT", "sarvam-m")
        self.model_tts = os.getenv("SARVAM_MODEL_TTS", "bulbul:v1")

        if self.api_key:
            logger.info("Sarvam client initialized (primary: STT/TTS, backup: chat)")
        else:
            logger.warning("SARVAM_API_KEY not set; Sarvam fallback disabled")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _post(self, url: str, payload: Dict[str, Any], timeout: float = 25.0) -> Optional[Dict[str, Any]]:
        """POST JSON payload to an absolute URL."""
        if not self.enabled:
            return None
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, headers=self._headers(), json=payload)
                if resp.status_code >= 400:
                    logger.warning("Sarvam %s → HTTP %s: %s", url, resp.status_code, resp.text[:200])
                    return None
                return resp.json()
        except Exception as exc:
            logger.warning("Sarvam request failed for %s: %s", url, exc)
            return None

    async def chat(self, message: str, system_prompt: str = "") -> Dict[str, Any]:
        """OpenAI-compatible chat completions via Sarvam LLM."""
        if not self.enabled:
            return {"error": "Sarvam key not configured", "content": None}

        payload = {
            "model": self.model_text,
            "messages": [
                {"role": "system", "content": system_prompt or "You are a helpful disaster safety assistant."},
                {"role": "user", "content": message},
            ],
            "max_tokens": int(os.getenv("SARVAM_MAX_TOKENS", "500")),
            "temperature": 0.6,
        }
        data = await self._post(f"{self.llm_base}/chat/completions", payload)
        if data:
            content = (
                (((data.get("choices") or [{}])[0].get("message") or {}).get("content"))
                or data.get("response")
                or data.get("text")
            )
            if content:
                return {"error": None, "content": content, "provider": "sarvam"}

        return {"error": "Sarvam text generation failed", "content": None}

    async def translate(self, text: str, source_language: str = "auto", target_language: str = "en") -> Dict[str, Any]:
        if not self.enabled:
            return {"error": "Sarvam key not configured", "translated_text": None}

        payload = {
            "input": text,
            "source_language": source_language,
            "target_language": target_language,
        }
        data = await self._post(f"{self.api_base}/translate", payload)
        if not data:
            return {"error": "Translation failed", "translated_text": None}

        translated = data.get("translated_text") or data.get("translation") or data.get("output")
        if not translated:
            return {"error": "Translation failed", "translated_text": None}
        return {"error": None, "translated_text": translated}

    # Speaker options per language (Sarvam bulbul:v1)
    _SPEAKERS = {
        "hi-IN": "meera", "en-IN": "anushka", "ta-IN": "arjun",
        "te-IN": "pavithra", "bn-IN": "diya", "gu-IN": "neel",
        "kn-IN": "misha", "ml-IN": "pavithra", "pa-IN": "neel",
        "mr-IN": "meera",
    }

    async def text_to_speech(self, text: str, language_code: str = "hi-IN", speaker: str = None) -> Dict[str, Any]:
        if not self.enabled:
            return {"error": "Sarvam key not configured", "audio_bytes": None}

        chosen_speaker = speaker or self._SPEAKERS.get(language_code, "meera")
        payload = {
            "inputs": [text[:500]],   # Sarvam TTS v2 accepts list
            "target_language_code": language_code,
            "speaker": chosen_speaker,
            "pitch": 0,
            "pace": 1.05,
            "loudness": 1.5,
            "speech_sample_rate": 22050,
            "enable_preprocessing": True,
            "model": self.model_tts,
        }
        data = await self._post(f"{self.api_base}/text-to-speech", payload, timeout=35.0)
        if not data:
            return {"error": "Sarvam TTS failed", "audio_bytes": None}

        # Sarvam returns a list of audios
        audios = data.get("audios") or []
        audio_b64 = (audios[0] if audios else None) or data.get("audio") or data.get("audio_base64")
        if not audio_b64:
            return {"error": "Sarvam TTS failed", "audio_bytes": None}

        try:
            import base64
            return {"error": None, "audio_bytes": base64.b64decode(audio_b64)}
        except Exception:
            return {"error": "Sarvam TTS decode failed", "audio_bytes": None}

    async def speech_to_text(self, file_path: str, language: str = None) -> Dict[str, Any]:
        """
        Sarvam Saarika STT — primary cheap STT provider.
        Endpoint: POST https://api.sarvam.ai/speech-to-text
        """
        if not self.enabled:
            return {"error": "Sarvam key not configured", "text": None}

        path = Path(file_path)
        if not path.exists():
            return {"error": "Audio file missing", "text": None}

        # Map language codes to Sarvam BCP-47 codes
        lang_map = {
            "hi": "hi-IN", "en": "en-IN", "ta": "ta-IN",
            "te": "te-IN", "bn": "bn-IN", "gu": "gu-IN",
            "kn": "kn-IN", "ml": "ml-IN", "pa": "pa-IN",
            "mr": "mr-IN", "hi-rom": "hi-IN",
        }
        lang_code = lang_map.get((language or "").lower().split("-")[0], "hi-IN")

        # Try the primary saarika endpoint first, then fallback variant
        endpoints = [
            f"{self.api_base}/speech-to-text",
            f"{self.llm_base}/audio/transcriptions",
        ]
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        for url in endpoints:
            try:
                # Keep STT latency bounded so voice UX stays responsive.
                async with httpx.AsyncClient(timeout=12.0) as client:
                    with path.open("rb") as audio_file:
                        files = {"file": (path.name, audio_file, mime_type)}
                        form = {"model": "saarika:v2", "language_code": lang_code}
                        resp = await client.post(
                            url,
                            headers={"Authorization": f"Bearer {self.api_key}"},
                            files=files,
                            data=form,
                        )
                    if resp.status_code >= 400:
                        logger.warning("Sarvam STT %s → HTTP %s", url, resp.status_code)
                        continue
                    payload = resp.json()
                    text = payload.get("transcript") or payload.get("text") or payload.get("output")
                    if text:
                        logger.info("Sarvam STT success via %s", url)
                        return {"error": None, "text": text, "language": lang_code}
            except Exception as exc:
                logger.warning("Sarvam STT endpoint %s failed: %s", url, exc)
                continue

        return {"error": "Sarvam STT failed", "text": None}


sarvam_client = SarvamClient()
