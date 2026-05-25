import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from database import AsyncSessionLocal, init_db, close_db, User, Alert, CommunityReport, CommunityPost
from passlib.context import CryptContext

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_data():
    logger.info("🌱 Seeding Database...")
    await init_db()
    
    async with AsyncSessionLocal() as db:
        
        # --- 1. Users ---
        users = [
            User(
                id=str(uuid.uuid4()),
                email="admin@suraksha.com",
                username="admin_suraksha",
                full_name="System Admin",
                password_hash=pwd_context.hash("admin123"),
                user_type="admin",
                location={"city": "New Delhi", "state": "Delhi"},
                is_active=True
            ),
            User(
                id=str(uuid.uuid4()),
                email="ramesh@citizen.com",
                username="ramesh_kumar",
                full_name="Ramesh Kumar",
                password_hash=pwd_context.hash("user123"),
                user_type="citizen",
                location={"city": "Patna", "state": "Bihar"},
                preferences={"alerts": ["flood", "storm"]},
                is_active=True
            ),
            User(
                id=str(uuid.uuid4()),
                email="priya@student.com",
                username="priya_student",
                full_name="Priya Singh",
                password_hash=pwd_context.hash("student123"),
                user_type="student",
                location={"city": "Bhubaneswar", "state": "Odisha"},
                preferences={"mode": "imaginative"},
                is_active=True
            ),
            User(
                id=str(uuid.uuid4()),
                email="dr.gupta@imd.gov.in",
                username="scientist_gupta",
                full_name="Dr. Gupta (IMD)",
                password_hash=pwd_context.hash("science123"),
                user_type="scientist",
                location={"city": "Pune", "state": "Maharashtra"},
                is_active=True
            ),
            User(
                id=str(uuid.uuid4()),
                email="farmer_ravi@kisan.com",
                username="ravi_kisan",
                full_name="Ravi Kisan",
                password_hash=pwd_context.hash("farmer123"),
                user_type="farmer",
                location={"city": "Amravati", "state": "Andhra Pradesh"},
                is_active=True
            )
        ]
        
        # Check if users exist to avoid duplicates (naive check)
        # For demo script, we can just try/except or clear DB. 
        # Let's just add new ones with unique IDs
        db.add_all(users)
        logger.info(f"Added {len(users)} Users.")

        # --- 2. Alerts (Active) ---
        alerts = [
            Alert(
                id=str(uuid.uuid4()),
                alert_type="flood",
                severity="critical",
                title="Critical Flood Warning: Kosi River",
                description="Water levels at dangerous levels in Supaul district. Evacuation advised for low-lying areas.",
                location={"lat": 26.1, "lon": 86.6, "city": "Supaul", "state": "Bihar"},
                source="CWC (Central Water Commission)",
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
                alert_metadata={"water_level": 55.4, "danger_mark": 54.0},
                is_active=True
            ),
            Alert(
                id=str(uuid.uuid4()),
                alert_type="cyclone",
                severity="high",
                title="Cyclone Alert: Coastal Odisha",
                description="Cyclonic storm approaching. Wind speeds expected to reach 90km/h. Secure loose objects.",
                location={"lat": 19.8, "lon": 85.8, "city": "Puri", "state": "Odisha"},
                source="IMD",
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=12),
                alert_metadata={"wind_speed": 85, "direction": "NW"},
                is_active=True
            ),
            Alert(
                id=str(uuid.uuid4()),
                alert_type="aqi",
                severity="high",
                title="Severe Air Quality Alert: Delhi NCR",
                description="AQI has crossed 400. Sensitive groups should avoid outdoor activities. Wear masks.",
                location={"lat": 28.7, "lon": 77.1, "city": "New Delhi", "state": "Delhi"},
                source="CPCB",
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=6),
                alert_metadata={"aqi": 412, "pm25": 305},
                is_active=True
            ),
             Alert(
                id=str(uuid.uuid4()),
                alert_type="earthquake",
                severity="medium",
                title="Minor Earthquake: Himalayan Region",
                description="Magnitude 4.2 earthquake detected. No Tsunami validation.",
                location={"lat": 30.2, "lon": 78.5, "city": "Rishikesh", "state": "Uttarakhand"},
                source="NCS",
                created_at=datetime.now(timezone.utc) - timedelta(hours=2), # 2 hours ago
                expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
                alert_metadata={"magnitude": 4.2, "depth": 10},
                is_active=True
            )
        ]
        db.add_all(alerts)
        logger.info(f"Added {len(alerts)} Alerts.")

        # --- 3. Community Reports ---
        reports = [
            CommunityReport(
                id=str(uuid.uuid4()),
                user_id=users[1].id, # Ramesh
                report_type="flood",
                title="Road blocked due to waterlogging",
                description="Main road near Gandhi Maidan is under 2 feet of water. Cannot pass.",
                location={"lat": 25.6, "lon": 85.1, "city": "Patna"},
                verified=True,
                upvotes=15,
                created_at=datetime.now(timezone.utc) - timedelta(minutes=45)
            ),
            CommunityReport(
                id=str(uuid.uuid4()),
                user_id=users[2].id, # Priya
                report_type="welfare",
                title="School shelter open",
                description="Local high school gym is now open as a temporary shelter. Food and water available.",
                location={"lat": 19.81, "lon": 85.82, "city": "Puri"},
                verified=True,
                upvotes=42,
                created_at=datetime.now(timezone.utc) - timedelta(minutes=20)
            )
        ]
        db.add_all(reports)
        logger.info(f"Added {len(reports)} Community Reports.")
        
        await db.commit()
        logger.info("✅ Database Seeded Successfully!")

    await close_db()

if __name__ == "__main__":
    asyncio.run(seed_data())
