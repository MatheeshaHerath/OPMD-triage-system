from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, Header
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import asyncio
import sqlite3
from datetime import datetime
import os
import shutil
from cryptography.fernet import Fernet

# Custom local modules
from database import engine, get_db
import models
import auth

# Command SQLAlchemy to build all tables in PostgreSQL
models.Base.metadata.create_all(bind=engine)

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

# UPDATED DATABASE SCHEMA
DB_FILE = "opmd_triage.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS triage_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            patient_name_encrypted TEXT,
            patient_nic_encrypted TEXT,
            patient_contact_encrypted TEXT,
            patient_sex TEXT,             -- NEW FIELD ADDED HERE
            patient_area TEXT,
            patient_age INTEGER,
            habit_duration TEXT,
            prediction TEXT,
            confidence REAL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.post("/api/upload")
async def upload_patient_data(
    image: UploadFile = File(...),
    patient_name: str = Form(...),
    patient_nic: str = Form(...),
    patient_contact: str = Form(...),
    patient_sex: str = Form(...),         # NEW FIELD ADDED HERE
    patient_area: str = Form(...),
    patient_age: int = Form(...),
    habit_duration: str = Form(...)
):
    await asyncio.sleep(2)
    mock_prediction = "High Risk OPMD"
    mock_confidence = 0.92
    
    # Encrypt
    enc_name = cipher_suite.encrypt(patient_name.encode()).decode()
    enc_nic = cipher_suite.encrypt(patient_nic.encode()).decode()
    enc_contact = cipher_suite.encrypt(patient_contact.encode()).decode()
    
    # Insert
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO triage_records 
            (timestamp, patient_name_encrypted, patient_nic_encrypted, patient_contact_encrypted, patient_sex, patient_area, patient_age, habit_duration, prediction, confidence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            enc_name, enc_nic, enc_contact, patient_sex, patient_area, 
            patient_age, habit_duration, mock_prediction, mock_confidence
        ))
        conn.commit()
        conn.close()
        print(f"🔒 SECURE SUCCESS: Encrypted record saved for {patient_name} ({patient_sex}) to {DB_FILE}")
    except Exception as e:
        print(f"❌ Database Error: {e}")

    return {
        "status": "success",
        "diagnostic_report": {
            "final_prediction": mock_prediction,
            "confidence_score": mock_confidence,
            "triage_advice": f"Urgent referral to {patient_area} District General Hospital recommended.",
        }
    }

# This tells FastAPI exactly what data to expect when creating a user
class UserCreate(BaseModel):
    username: str
    password: str
    role: str

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

    # Create a secure folder on the server to hold the clinical images
    os.makedirs("uploads", exist_ok=True)

    @app.post("/api/upload")
    async def upload_patient_data(
        patient_name: str = Form(...),
        contact_number: str = Form(...),
        residential_district: str = Form(...),
        age: int = Form(...),
        sex: str = Form(...),
        habit: str = Form(...),
        file: UploadFile = File(...),
        authorization: str = Header(None) # This catches Nurse Sarah's VIP Badge
    ):
        # 1. Save the clinical image securely to the hard drive
        file_location = f"uploads/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        # 2. Print the data to the Python terminal so we can see it arrived!
        print("\n" + "="*40)
        print("🚨 NEW OPMD PATIENT CASE RECEIVED 🚨")
        print("="*40)
        print(f"Patient Name: {patient_name}")
        print(f"Contact:      {contact_number}")
        print(f"District:     {residential_district}")
        print(f"Age/Sex:      {age} / {sex}")
        print(f"Risk Habit:   {habit}")
        print(f"Image Saved:  {file_location}")
        print("="*40 + "\n")

        # 3. Tell React it was a success
        return {"message": "Patient case successfully received by the vault."}