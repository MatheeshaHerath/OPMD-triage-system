import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './App.css';

function CaseDetail() {
    const location = useLocation();
    const navigate = useNavigate();
    const [surgeonNote, setSurgeonNote] = useState("");

    // NEW: State to track if an image is currently in full-screen mode
    const [fullScreenImage, setFullScreenImage] = useState(null);

    const selectedCase = location.state?.patientCase;

    if (!selectedCase) {
        return (
            <div className="dashboard-container">
                <h2 style={{ color: 'white' }}>No patient selected.</h2>
                <button onClick={() => navigate('/dashboard')} className="view-btn">Return to Queue</button>
            </div>
        );
    }

    const handleDecision = async (finalStatus) => {
        try {
            // Actually send the PUT request to the FastAPI backend!
            const response = await fetch(`http://localhost:8000/api/cases/${selectedCase.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: finalStatus,
                    surgeon_note: surgeonNote
                })
            });

            if (!response.ok) throw new Error("Failed to update database.");

            // Success!
            alert(`Case ${selectedCase.tracking_number} officially updated to ${finalStatus}!`);
            navigate('/dashboard'); // Kick them back to the queue

        } catch (error) {
            console.error("Error updating case:", error);
            alert("Failed to save. Is the server running?");
        }
    };

    return (
        <div className="dashboard-container">

            {/* --- NEW: FULL SCREEN OVERLAY --- */}
            {/* If fullScreenImage has a value, render this giant dark overlay */}
            {fullScreenImage && (
                <div className="fullscreen-overlay" onClick={() => setFullScreenImage(null)}>
                    <span className="close-fullscreen">✖ Close</span>
                    <div className="fullscreen-content">
                        <h2>{fullScreenImage} View</h2>
                        <div className="fullscreen-placeholder">
                            <p>📷 Detailed {fullScreenImage} will render here.</p>
                        </div>
                    </div>
                </div>
            )}

            <button onClick={() => navigate('/dashboard')} className="logout-btn" style={{ marginBottom: '2rem', backgroundColor: '#333' }}>
                ← Back to Queue
            </button>

            <div className="case-detail-panel" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                <h2 style={{ borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                    Case Review: {selectedCase.tracking_number}
                </h2>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '1.1rem' }}>
                    <p><strong>Patient Name:</strong> {selectedCase.patient_name}</p>
                    <p><strong>Age/Sex:</strong> {selectedCase.age} | {selectedCase.sex}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    <p><strong>District:</strong> {selectedCase.residential_district}</p>
                    <p><strong>Risk Factor:</strong> {selectedCase.habit}</p>
                </div>

                {/* --- NEW: SIDE-BY-SIDE IMAGE COMPARISON --- */}
                <div className="image-comparison-container">

                    {/* Left Side: Original Image */}
                    <div className="image-box" onClick={() => setFullScreenImage('Original Clinical Image')}>
                        <div className="image-header">Original Clinical Photo</div>
                        <div className="image-content">
                            <p>📷 Original Upload</p>
                            <small>(Click to enlarge)</small>
                        </div>
                    </div>

                    {/* Right Side: AI Heatmap */}
                    <div className="image-box" onClick={() => setFullScreenImage('AI GRAD-CAM Heatmap')}>
                        <div className="image-header" style={{ color: '#e63946' }}>AI Heatmap Analysis</div>
                        <div className="image-content">
                            <p>🔥 GRAD-CAM Results</p>
                            <small>(Click to enlarge)</small>
                        </div>
                    </div>

                </div>

                {/* Surgeon Note Section */}
                <div className="note-section" style={{ marginTop: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4da8da', fontWeight: 'bold' }}>
                        Add Clinical Note for Nurse:
                    </label>
                    <textarea
                        className="surgeon-textarea"
                        placeholder="E.g., High risk of leukoplakia. Please schedule an immediate biopsy..."
                        value={surgeonNote}
                        onChange={(e) => setSurgeonNote(e.target.value)}
                    />
                </div>

                <div className="surgeon-actions">
                    <button onClick={() => handleDecision("High Risk")} className="btn-approve">Mark as High Risk</button>
                    <button onClick={() => handleDecision("Low Risk")} className="btn-reject">Mark as Low Risk</button>
                </div>
            </div>
        </div>
    );
}

export default CaseDetail;