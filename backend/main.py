from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, Header
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import shutil
from cryptography.fernet import Fernet
from sqlalchemy import func

# Custom local modules
from database import engine, get_db
import models
import auth

# Command SQLAlchemy to build all tables in PostgreSQL
models.Base.metadata.create_all(bind=engine)

# Pydantic schema for creating a new user
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "midwife"

from typing import Optional

class CaseUpdate(BaseModel):
    status: str
    surgeon_note: Optional[str] = None

app = FastAPI(title="Secure OPMD Triage System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SECURITY SETUP
KEY_FILE = "secret.key"
if not os.path.exists(KEY_FILE):
    with open(KEY_FILE, "wb") as key_file:
        key_file.write(Fernet.generate_key())

with open(KEY_FILE, "rb") as key_file:
    SECRET_KEY = key_file.read()

cipher_suite = Fernet(SECRET_KEY)


@app.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if the user already exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # 2. Scramble the password using the tools from auth.py
    hashed_pwd = auth.get_password_hash(user.password)

    # 3. Create the new user and save it to the database
    new_user = models.User(username=user.username, hashed_password=hashed_pwd, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": f"User {new_user.username} created successfully as a {new_user.role}"}


@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Look for the username in the database
    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    # 2. If the user doesn't exist, OR the password hash doesn't match, kick them out
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. If they pass, print their VIP Badge (JWT) with their username and role
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})

    # 4. Hand the badge to the user
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/upload")
async def upload_patient_data(
    patient_name: str = Form(...),
    contact_number: str = Form(...),
    residential_district: str = Form(...),
    age: int = Form(...),
    sex: str = Form(...),
    habit: str = Form(...),
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Create a secure folder on the server to hold the clinical images
    os.makedirs("uploads", exist_ok=True)
    
    # 2. Save the clinical image securely to the hard drive
    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    # 3. Package the data into a database record
    new_case = models.PatientCase(
        patient_name=patient_name,
        contact_number=contact_number,
        residential_district=residential_district,
        age=age,
        sex=sex,
        habit=habit,
        image_path=file_location,
        status="Pending Triage"
    )
    
    # 4. Lock it into the vault!
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    # 5. Print confirmation to the terminal
    print("\n" + "="*40)
    print("🚨 NEW OPMD PATIENT CASE RECORDED 🚨")
    print("="*40)
    print(f"Database ID:  {new_case.id}")
    print(f"Patient Name: {new_case.patient_name}")
    print(f"Status:       {new_case.status}")
    print("="*40 + "\n")

    # 6. Tell React it was a success, passing back the new database ID
    return {"message": "Patient case successfully received by the vault.", "case_id": new_case.id}


# --- NEW ENDPOINT ADDED HERE ---
@app.get("/api/cases")
def get_all_cases(db: Session = Depends(get_db)):
    # 1. Reach into the PatientCase table
    # 2. Grab every record
    # 3. Sort them so the newest cases appear at the top of the queue
    cases = db.query(models.PatientCase).order_by(models.PatientCase.id.desc()).all()
    
    # 4. Hand the list back to the frontend
    return cases

# --- MIDWIFE PROFILE ENDPOINT ---
@app.get("/api/profile/midwife")
def get_midwife_profile(db: Session = Depends(get_db)):
    # 1. Get the 5 most recent cases
    recent_cases = db.query(models.PatientCase).order_by(models.PatientCase.id.desc()).limit(5).all()
    
    # 2. The Math (Grouping by YOUR real date_filed column)
    daily_counts = db.query(
        func.date(models.PatientCase.date_filed).label('date'),
        func.count(models.PatientCase.id).label('count')
    ).group_by(func.date(models.PatientCase.date_filed)).all()

    # 3. Package it for React
    return {
        "name": "Nurse Sarah",
        "role": "Midwife",
        "assigned_doctor": "Dr. Smith (Surgeon)",
        "recent_queue": recent_cases,
        "calendar_data": [{"date": str(d.date), "count": d.count} for d in daily_counts if d.date is not None]
    }

    # --- DATABASE SEEDING ENDPOINT ---
@app.post("/api/seed")
def seed_database(db: Session = Depends(get_db)):
    # 1. Create Nurse Sarah
    nurse = db.query(models.User).filter(models.User.username == "nurse_sarah").first()
    if not nurse:
        new_nurse = models.User(
            username="nurse_sarah",
            hashed_password=auth.get_password_hash("mypassword123"), 
            role="midwife",
            assigned_doctor="Dr. Smith"
        )
        db.add(new_nurse)

    # 2. Create Dr. Smith
    doctor = db.query(models.User).filter(models.User.username == "dr smith").first()
    if not doctor:
        new_doc = models.User(
            username="dr smith",
            hashed_password=auth.get_password_hash("securepassword"),
            role="surgeon"
        )
        db.add(new_doc)

    db.commit()
    return {"message": "Database successfully seeded with default users!"}

@app.put("/api/cases/{case_id}")
def update_case(case_id: int, case_data: CaseUpdate, db: Session = Depends(get_db)):
    db_case = db.query(models.PatientCase).filter(models.PatientCase.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Update the database values
    db_case.status = case_data.status
    db_case.surgeon_note = case_data.surgeon_note
    
    db.commit()
    db.refresh(db_case)
    return {"message": "Case successfully updated!"}
