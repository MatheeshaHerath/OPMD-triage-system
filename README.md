# OPMD Triage System - Setup Guide

## How to Run the Application
1. Ensure Docker Desktop is installed and running on your machine.
2. Open a terminal in this root directory.
3. Run the command: docker-compose up --build
4. The Frontend will be available at: http://localhost:5173
5. The Backend API will be available at: http://localhost:8000/docs

## ⚠️  Important Note Regarding System Access & Login
For clinical security and Role-Based Access Control (RBAC), this application intentionally does not have a public registration page on the frontend. 

Because Docker spins up a fresh, completely empty database upon first launch, you must provision an initial clinical user via the backend API before you can log in to the frontend dashboard.

Step 1: Once Docker is running, navigate to the backend API Swagger documentation: http://localhost:8000/docs
Step 2: Find the endpoint to create/register a user (e.g., POST /users or POST /register).
Step 3: Click "Try it out", enter a test email and password, and click "Execute" to save the user to the database.
Step 4: Return to the frontend (http://localhost:5173) and log in using those exact credentials you just created.
