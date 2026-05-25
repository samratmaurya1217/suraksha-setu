"""
Quick Telegram Test Script
─────────────────────────
Usage:
  1. Message @SurakshaSetuBot  with any text (e.g. /start)
  2. Run this script: python backend/scripts/test_telegram.py
  3. It will find your chat_id and send you a welcome message.

Run from repo root: python backend/scripts/test_telegram.py
"""
import asyncio
import sys
import os

# allow importing from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import httpx
from telegram_service import telegram_service, TELEGRAM_BOT_TOKEN


async def main():
    if not telegram_service.enabled:
        print("❌  TELEGRAM_BOT_TOKEN not set.  Add it to backend/.env")
        return

    print(f"✅  Bot token loaded.  Fetching recent updates …")

    async with httpx.AsyncClient(timeout=15) as client:
        # 1. Get bot info
        r = await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe")
        bot = r.json().get("result", {})
        print(f"    Bot: @{bot.get('username')} — \"{bot.get('first_name')}\"")

        # 2. Get updates (any user who messaged the bot)
        r = await client.get(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates",
            params={"limit": 20, "timeout": 0},
        )
        updates = r.json().get("result", [])

    if not updates:
        print("\n⚠️  No updates found.")
        print("   → Open Telegram and message @SurakshaSetuBot, then re-run this script.\n")
        return

    # Collect unique chat_ids
    seen = {}
    for upd in updates:
        msg = upd.get("message") or upd.get("callback_query", {}).get("message", {})
        chat = msg.get("chat", {}) if msg else {}
        cid = chat.get("id")
        if cid and cid not in seen:
            seen[cid] = chat.get("username") or chat.get("first_name") or str(cid)

    print(f"\n📋  Found {len(seen)} chat(s):")
    for cid, name in seen.items():
        print(f"   • {cid}  ({name})")

    # Send test alert to all found chats
    test_alert = {
        "title": "🧪 Suraksha Setu — System Test",
        "severity": "warning",
        "description": (
            "This is a test alert from the Suraksha Setu Admin Panel.\n"
            "Your Telegram notifications are working correctly! ✅\n\n"
            "Stay safe — NDMA Helpline: 1078 | Emergency: 112"
        ),
        "location": {"city": "Test City", "state": "India"},
    }
    text = telegram_service._format_alert(test_alert)

    print("\n📤  Sending test alert …")
    for cid in seen:
        ok = await telegram_service.send_message(str(cid), text)
        status = "✅ Sent" if ok else "❌ Failed"
        print(f"   {status}  →  chat_id {cid}")

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
