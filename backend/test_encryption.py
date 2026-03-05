import sqlite3
from cryptography.fernet import Fernet

print("\n--- INITIATING SECURE DATABASE SCAN (V2) ---")

# 1. Load your master encryption key
try:
    with open("secret.key", "rb") as key_file:
        SECRET_KEY = key_file.read()
    cipher_suite = Fernet(SECRET_KEY)
except FileNotFoundError:
    print("❌ ERROR: secret.key not found!")
    exit()

# 2. Connect to the database
conn = sqlite3.connect("opmd_triage.db")
cursor = conn.cursor()

try:
    # 3. Fetch records, including our brand new 'patient_sex' column!
    cursor.execute("SELECT id, patient_name_encrypted, patient_nic_encrypted, patient_sex FROM triage_records")
    records = cursor.fetchall()
    
    if not records:
        print("Database is empty. Submit a form from your frontend first!")
    
    # 4. Decrypt and display them side-by-side
    for record in records:
        record_id = record[0]
        enc_name = record[1]
        enc_nic = record[2]
        patient_sex = record[3] # This is stored as plaintext
        
        # Unlock the sensitive data
        decrypted_name = cipher_suite.decrypt(enc_name.encode()).decode()
        decrypted_nic = cipher_suite.decrypt(enc_nic.encode()).decode()
        
        print(f"\n[Patient ID: {record_id} | Gender: {patient_sex}]")
        print(f"🔒︎ Raw Database View (Encrypted Name): {enc_name[:30]}...") 
        print(f"ꗃ  Dashboard View (Decrypted):         {decrypted_name} ({decrypted_nic})")

except Exception as e:
    print(f"❌ Error reading database: {e}")

finally:
    conn.close()
    print("\n--- SCAN COMPLETE ---\n")