import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from database import Base

# Table 1: The Healthcare Workers (Midwives & Surgeons)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    
    # NEW: Link this user to a doctor
    assigned_doctor = Column(String, nullable=True)
    
# Table 2: The Patient Cases
class PatientCase(Base):
    __tablename__ = "patient_cases"

    id = Column(Integer, primary_key=True, index=True)

    # Auto-generates a unique ID like "OPMD-9F8A3B"
    tracking_number = Column(String, unique=True, index=True, default=lambda: f"OPMD-{uuid.uuid4().hex[:6].upper()}")

    # Links this case to the specific Midwife who uploaded it (Nullable for now until frontend auth is fully wired)
    midwife_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # --- PATIENT DEMOGRAPHICS (From React Form) ---
    patient_name = Column(String, index=True)
    contact_number = Column(String)
    residential_district = Column(String)
    age = Column(Integer)
    sex = Column(String)
    habit = Column(String)

    # Where the image is saved and what the AI thinks
    image_path = Column(String, nullable=True) 
    heatmap_path = Column(String, nullable=True)
    prediction_class = Column(String, nullable=True) 
    prediction_confidence = Column(String, nullable=True) 
    prediction_results = Column(String, nullable=True)
    status = Column(String, default="Pending AI Analysis")
    surgeon_note = Column(String, nullable=True)
    surgeon_notes = Column(String, nullable=True)

    # Timestamps the exact moment it was filed
    date_filed = Column(DateTime, default=datetime.utcnow)