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

            {/* If fullScreenImage has a value, render this giant dark overlay */}
            {/* --- NEW: FULL SCREEN OVERLAY --- */}
            {fullScreenImage && (
                <div
                    className="fullscreen-overlay"
                    onClick={() => setFullScreenImage(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.95)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999
                    }}
                >
                    <span
                        className="close-fullscreen"
                        style={{
                            position: 'absolute',
                            top: '25px',
                            right: '35px',
                            cursor: 'pointer',
                            fontSize: '1.5rem',
                            color: 'white',
                            zIndex: 10000,
                            fontWeight: 'bold',
                            textShadow: '0 2px 4px rgba(0,0,0,1)'
                        }}
                    >
                        ✖ Close
                    </span>

                    {/* This container defines the maximum size of the pop-up (90% of screen) */}
                    <div style={{ width: '90vw', height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <img
                            src={fullScreenImage === 'original'
                                ? `http://localhost:8000/${selectedCase.image_path}`
                                : `http://localhost:8000/${selectedCase.heatmap_path}`
                            }
                            alt="Enlarged View"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain', /* Forces the tiny 224px image to scale up perfectly! */
                                borderRadius: '8px',
                                boxShadow: '0 10px 40px rgba(0,0,0,1)'
                            }}
                        />
                    </div>
                </div>
            )}

            <button onClick={() => navigate('/dashboard')} className="logout-btn" style={{ marginBottom: '2rem', backgroundColor: '#333' }}>
                ← Back to Queue
            </button>

            {/* --- NEW TWO-COLUMN CASE REVIEW LAYOUT --- */}
            <div className="modern-dashboard" style={{ marginTop: '1rem', padding: 0 }}>

                {/* --- LEFT SIDE: PATIENT DATA --- */}
                <div className="sidebar-column">
                    <div className="profile-header">
                        <h2 style={{ borderBottom: '2px solid #f4f6f8', paddingBottom: '1rem', width: '100%', marginTop: '0' }}>
                            Case Details
                        </h2>
                        <h3 style={{ color: '#007bff', margin: '0 0 1.5rem 0' }}>{selectedCase.tracking_number}</h3>

                        <div style={{ textAlign: 'left', width: '100%', padding: '0 1rem' }}>
                            <p style={{ marginBottom: '1rem' }}><strong>Patient Name:</strong> <br />{selectedCase.patient_name}</p>
                            <p style={{ marginBottom: '1rem' }}><strong>Age / Sex:</strong> <br />{selectedCase.age} | {selectedCase.sex}</p>
                            <p style={{ marginBottom: '1rem' }}><strong>District:</strong> <br />{selectedCase.residential_district}</p>
                            <p style={{ marginBottom: '1rem' }}>
                                <strong>Risk Factor:</strong> <br />
                                <span style={{ color: selectedCase.habit !== 'None' ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                                    {selectedCase.habit}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT SIDE: PHOTOS, AI & NOTES --- */}
                <div className="main-column">
                    <div className="case-review-card" style={{ paddingTop: '0.5rem', marginTop: '0' }}>

                        {/* --- SIDE-BY-SIDE IMAGE COMPARISON --- */}
                        <div className="image-comparison-container" style={{ marginTop: '0' }}>

                            {/* Left Side: Original Image */}
                            <div
                                className="image-box"
                                onClick={() => setFullScreenImage('original')}
                                style={{ padding: selectedCase.image_path ? '0' : '1.5rem', overflow: 'hidden', cursor: 'pointer' }}
                            >
                                {selectedCase.image_path ? (
                                    <img
                                        src={`http://localhost:8000/${selectedCase.image_path}`}
                                        alt="Original Clinical Photo"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    <>
                                        <div className="image-header" style={{ color: '#ffffff' }}>Original Clinical Photo</div>
                                        <div className="image-content">
                                            <p>📷 Original Upload</p>
                                            <small>(Click to enlarge)</small>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right Side: AI Heatmap */}
                            <div
                                className="image-box"
                                onClick={() => setFullScreenImage('heatmap')}
                                style={{ padding: selectedCase.heatmap_path ? '0' : '1.5rem', overflow: 'hidden', cursor: 'pointer' }}
                            >
                                {selectedCase.heatmap_path ? (
                                    <img
                                        src={`http://localhost:8000/${selectedCase.heatmap_path}`}
                                        alt="AI Heatmap"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    <>
                                        <div className="image-header" style={{ color: '#e63946' }}>AI Heatmap Analysis</div>
                                        <div className="image-content">
                                            <p>🔥 Heatmap processing...</p>
                                            <small>(Click to enlarge)</small>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* --- SURGEON NOTE SECTION --- */}
                        <div className="note-section" style={{ marginTop: '2.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.8rem', color: '#333', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                Add Clinical Note for Nurse:
                            </label>
                            <textarea
                                className="surgeon-textarea"
                                placeholder="E.g., High risk of leukoplakia. Please schedule an immediate biopsy..."
                                value={surgeonNote}
                                onChange={(e) => setSurgeonNote(e.target.value)}
                                style={{ width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
                            />
                        </div>

                        {/* --- ACTION BUTTONS --- */}
                        <div className="surgeon-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <button onClick={() => handleDecision("High Risk")} className="btn-approve" style={{ flex: 1, padding: '1rem', fontSize: '1.1rem' }}>
                                Mark as High Risk
                            </button>
                            <button onClick={() => handleDecision("Low Risk")} className="btn-reject" style={{ flex: 1, padding: '1rem', fontSize: '1.1rem' }}>
                                Mark as Low Risk
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}

export default CaseDetail;