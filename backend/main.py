from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import os
import shutil
import json
import numpy as np
import tensorflow as tf
from PIL import Image
import cv2
from cryptography.fernet import Fernet

from database import engine, get_db
import models
import auth

models.Base.metadata.create_all(bind=engine)

# =========================
# APP SETUP
# =========================

app = FastAPI(title="Secure OPMD Triage System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This opens the uploads folder so React can see the images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# =========================
# LOAD COMPLETE .KERAS MODELS (THE ENSEMBLE)
# =========================
MODEL_DIR = "models"
print("\nLoading Ensemble Models...")
resnet_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "resnet50_final_model.keras"))
efficientnet_model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "efficientnetB4_final_optimized.keras"))
print("Ensemble models loaded successfully!")

CLASS_NAMES = ["Cancer", "Leukoplakia", "Normal", "OLP", "OSF"]

# =========================
# GRAD-CAM (THE SURGICAL EXTRACTION BYPASS)
# =========================
def get_gradcam_heatmap(img_array, model):
    core_brain = None
    classifier_layers = []
    found_brain = False
    
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model): 
            core_brain = layer
            found_brain = True
        elif found_brain: 
            classifier_layers.append(layer)
            
    if core_brain is None:
        core_brain = model 
        
    last_conv_name = None
    for layer in reversed(core_brain.layers):
        try:
            if len(layer.output.shape) == 4:
                last_conv_name = layer.name
                break
        except:
            pass

    grad_model = tf.keras.Model(
        core_brain.inputs, 
        [core_brain.get_layer(last_conv_name).output, core_brain.output]
    )
    
    with tf.GradientTape() as tape:
        inputs = tf.cast(img_array, tf.float32)
        try:
            conv_outputs, brain_preds = grad_model(inputs, training=False)
        except:
            conv_outputs, brain_preds = grad_model([inputs], training=False)
            
        preds = brain_preds
        for layer in classifier_layers:
            preds = layer(preds, training=False)
            
        class_idx = tf.argmax(preds[0])
        class_channel = preds[:, class_idx]
        
    grads = tape.gradient(class_channel, conv_outputs)
    if grads is None:
        grads = tf.ones_like(conv_outputs)
        
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-10)
    
    return heatmap.numpy()

# =========================
# IMAGE PREPROCESS & FUSION LOGIC
# =========================
def preprocess_image_for_model(image_path):
    img = tf.keras.utils.load_img(image_path, target_size=(224, 224))
    image_array = tf.keras.utils.img_to_array(img)
    image_array = np.expand_dims(image_array, axis=0)
    # Apply EfficientNet preprocessing (scales pixels appropriately)
    return tf.keras.applications.efficientnet.preprocess_input(image_array)

def generate_ensemble_prediction_and_heatmap(image_path, safe_filename):
    # 1. Preprocess Image
    processed_image = preprocess_image_for_model(image_path)
    
    # 2. Get Predictions from both models
    resnet_preds = resnet_model.predict(processed_image, verbose=0)
    effnet_preds = efficientnet_model.predict(processed_image, verbose=0)
    
    # 3. Mathematical Fusion of Predictions (The Tie-Breaker)
    ensemble_preds = (resnet_preds + effnet_preds) / 2.0
    
    final_class_idx = int(np.argmax(ensemble_preds[0]))
    predicted_class = CLASS_NAMES[final_class_idx]
    confidence = float(np.max(ensemble_preds[0]) * 100)
    
    # Create the all_predictions dictionary
    all_predictions = []
    for i, class_name in enumerate(CLASS_NAMES):
        all_predictions.append({
            "class": class_name,
            "confidence": round(float(ensemble_preds[0][i] * 100), 2)
        })
    all_predictions = sorted(all_predictions, key=lambda x: x["confidence"], reverse=True)

    # 4. Get Individual Heatmaps
    resnet_heatmap = get_gradcam_heatmap(processed_image, resnet_model)
    effnet_heatmap = get_gradcam_heatmap(processed_image, efficientnet_model)

    # 5. Fuse the Heatmaps together
    ensemble_heatmap = (resnet_heatmap + effnet_heatmap) / 2.0
    
    # 6. Apply Clinical Noise Filter
    ensemble_heatmap = cv2.resize(ensemble_heatmap, (224, 224))
    ensemble_heatmap[ensemble_heatmap < 0.4] = 0  # Removes distracting blue background
    
    # 7. Apply color and overlay
    original_img = cv2.imread(image_path)
    original_img = cv2.resize(original_img, (224, 224))
    
    heatmap_uint8 = np.uint8(255 * ensemble_heatmap)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    
    # Create final superimposed image
    superimposed_img = cv2.addWeighted(original_img, 0.6, heatmap_color, 0.4, 0)
    
    # 8. Save the physical file so React can read it
    heatmap_filename = f"heatmap_{safe_filename}"
    heatmap_location = f"uploads/{heatmap_filename}"
    cv2.imwrite(heatmap_location, superimposed_img)
    
    return {
        "predicted_class": predicted_class,
        "confidence": round(confidence, 2),
        "all_predictions": all_predictions,
        "heatmap_path": heatmap_location
    }

# =========================
# SECURITY SETUP
# =========================

KEY_FILE = "secret.key"

if not os.path.exists(KEY_FILE):
    with open(KEY_FILE, "wb") as key_file:
        key_file.write(Fernet.generate_key())

with open(KEY_FILE, "rb") as key_file:
    SECRET_KEY = key_file.read()

cipher_suite = Fernet(SECRET_KEY)

# =========================
# SCHEMAS
# =========================

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "midwife"


class CaseUpdate(BaseModel):
    status: str
    surgeon_note: Optional[str] = None


# =========================
# AUTH ROUTES
# =========================

@app.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()

    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_pwd = auth.get_password_hash(user.password)

    new_user = models.User(
        username=user.username,
        hashed_password=hashed_pwd,
        role=user.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": f"User {new_user.username} created successfully as a {new_user.role}"
    }


@app.post("/api/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# =========================
# UPLOAD + AI PREDICTION ROUTE
# =========================

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
    db: Session = Depends(get_db),
):
    os.makedirs("uploads", exist_ok=True)

    safe_filename = file.filename.replace(" ", "_")
    file_location = f"uploads/{safe_filename}"

    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    try:
        # Run the complete Ensemble and Grad-CAM pipeline
        ai_result = generate_ensemble_prediction_and_heatmap(file_location, safe_filename)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Image uploaded, but AI prediction failed: {str(e)}",
        )

    new_case = models.PatientCase(
        patient_name=patient_name,
        contact_number=contact_number,
        residential_district=residential_district,
        age=age,
        sex=sex,
        habit=habit,
        
        # Save both paths to the DB!
        image_path=file_location,
        heatmap_path=ai_result["heatmap_path"], 
        
        status="Pending Triage",
        prediction_class=ai_result["predicted_class"],
        prediction_confidence=ai_result["confidence"],
        prediction_results=json.dumps(ai_result["all_predictions"]),
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return {
        "message": "Patient case successfully received and analyzed by AI model.",
        "case_id": new_case.id,
        "image_path": file_location,
        "prediction": {
            "predicted_class": ai_result["predicted_class"],
            "confidence": ai_result["confidence"],
            "all_predictions": ai_result["all_predictions"],
        },
    }


# =========================
# CASE ROUTES
# =========================

@app.get("/api/cases")
def get_all_cases(db: Session = Depends(get_db)):
    cases = db.query(models.PatientCase).order_by(models.PatientCase.id.desc()).all()
    return cases


@app.put("/api/cases/{case_id}")
def update_case(
    case_id: int,
    case_data: CaseUpdate,
    db: Session = Depends(get_db),
):
    db_case = db.query(models.PatientCase).filter(models.PatientCase.id == case_id).first()

    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")

    db_case.status = case_data.status
    db_case.surgeon_note = case_data.surgeon_note

    db.commit()
    db.refresh(db_case)

    return {"message": "Case successfully updated!"}


# =========================
# MIDWIFE PROFILE
# =========================

@app.get("/api/profile/midwife")
def get_midwife_profile(db: Session = Depends(get_db)):
    recent_cases = (
        db.query(models.PatientCase)
        .order_by(models.PatientCase.id.desc())
        .limit(5)
        .all()
    )

    daily_counts = db.query(
        func.date(models.PatientCase.date_filed).label("date"),
        func.count(models.PatientCase.id).label("count"),
    ).group_by(func.date(models.PatientCase.date_filed)).all()

    return {
        "name": "Nurse Sarah",
        "role": "Midwife",
        "assigned_doctor": "Dr. Smith (Surgeon)",
        "recent_queue": recent_cases,
        "calendar_data": [
            {
                "date": str(d.date),
                "count": d.count,
            }
            for d in daily_counts
            if d.date is not None
        ],
    }


# =========================
# SEED ROUTE
# =========================

@app.post("/api/seed")
def seed_database(db: Session = Depends(get_db)):
    nurse = db.query(models.User).filter(models.User.username == "nurse_sarah").first()

    if not nurse:
        new_nurse = models.User(
            username="nurse_sarah",
            hashed_password=auth.get_password_hash("mypassword123"),
            role="midwife",
            assigned_doctor="Dr. Smith",
        )
        db.add(new_nurse)

    doctor = db.query(models.User).filter(models.User.username == "dr smith").first()

    if not doctor:
        new_doc = models.User(
            username="dr smith",
            hashed_password=auth.get_password_hash("securepassword"),
            role="surgeon",
        )
        db.add(new_doc)

    db.commit()

    return {"message": "Database successfully seeded with default users!"}