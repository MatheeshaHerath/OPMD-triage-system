import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt

# This tells Python to use the bcrypt algorithm to scramble passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# The secret key used to sign the VIP badges (JWTs)
# In production, this should be a massive random string hidden in a .env file
SECRET_KEY = "super_secret_opmd_key_for_testing_only"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Creates the encrypted JWT string
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt