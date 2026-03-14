import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from database import Base

# Table 1: The Healthcare Workers (Midwives & Surgeons)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # "midwife" or "surgeon"

# Table 2: The Patient Cases
class PatientCase(Base):
    __tablename__ = "patient_cases"

    id = Column(Integer, primary_key=True, index=True)
    
    # Auto-generates a unique ID like "OPMD-9F8A3B"
    tracking_number = Column(String, unique=True, index=True, default=lambda: f"OPMD-{uuid.uuid4().hex[:6].upper()}")
    
    # Links this case to the specific Midwife who uploaded it
    midwife_id = Column(Integer, ForeignKey("users.id"))
    
    # Where the image is saved and what the AI thinks
    image_filepath = Column(String, nullable=True) 
    ai_risk_status = Column(String, default="Pending AI Analysis")
    surgeon_notes = Column(String, nullable=True)
    
    # Timestamps the exact moment it was filed
    date_filed = Column(DateTime, default=datetime.utcnow)