from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import sqlite3
from datetime import datetime
import os
from cryptography.fernet import Fernet

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