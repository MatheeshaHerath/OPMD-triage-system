import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import './App.css';

function Profile() {
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const [expandedRowId, setExpandedRowId] = useState(null);

    // NEW: State to track the last time the data was fetched
    const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

    // NEW: We pulled the fetch function out so the timer AND the button can use it
    const fetchProfile = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/profile/midwife");
            if (!response.ok) throw new Error("Failed to fetch profile data");
            const data = await response.json();
            setProfile(data);
            setLastRefreshed(new Date().toLocaleTimeString()); // Update the clock!
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        // 1. Fetch immediately when the page loads
        fetchProfile();

        // 2. Set up the 10-second polling timer
        const intervalId = setInterval(() => {
            fetchProfile();
        }, 10000);

        // 3. Clean up the timer if she leaves the page
        return () => clearInterval(intervalId);
    }, []);

    const toggleRow = (id) => {
        if (expandedRowId === id) {
            setExpandedRowId(null);
        } else {
            setExpandedRowId(id);
        }
    };

    if (error) return <div className="error-text">{error}</div>;
    if (!profile) return <div className="loading">Loading Profile...</div>;

    const today = new Date();
    const shiftDate = (date, numMonths) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() - numMonths);
        return newDate;
    };

    return (
        <div className="dashboard-container">
            {/* 1. Profile Header */}
            <div className="profile-header">
                <div className="avatar">🩺</div>
                <div>
                    <h2>{profile.name}</h2>
                    <p className="role-text">{profile.role} | Assigned to: <strong>{profile.assigned_doctor}</strong></p>
                </div>
            </div>

            {/* 2. Upload Activity Calendar */}
            <div className="calendar-panel">
                <h3>Upload Activity (Last 4 Months)</h3>
                <CalendarHeatmap
                    startDate={shiftDate(today, 4)}
                    endDate={today}
                    values={profile.calendar_data || []}
                    classForValue={(value) => {
                        if (!value || value.count === 0) return 'color-empty';
                        if (value.count === 1) return 'color-scale-1';
                        if (value.count >= 2) return 'color-scale-2';
                        return 'color-scale-3';
                    }}
                    titleForValue={(value) => {
                        if (!value) return "0 uploads";
                        return `${value.count} uploads on ${value.date}`;
                    }}
                />
            </div>

            {/* 3. Real-Time Queue Table */}
            <div className="table-wrapper" style={{ marginTop: '2rem' }}>

                {/* --- NEW: The Refresh Header --- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Recent Case Uploads</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <small style={{ color: '#888' }}>Last updated: {lastRefreshed}</small>
                        <button
                            onClick={fetchProfile}
                            className="view-btn"
                            style={{ backgroundColor: '#333', color: 'white', padding: '0.4rem 0.8rem' }}
                        >
                            ↻ Refresh Now
                        </button>
                    </div>
                </div>

                <table className="triage-table">
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Patient Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!profile.recent_queue || profile.recent_queue.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center' }}>No recent uploads</td></tr>
                        ) : (
                            profile.recent_queue.map((c) => (
                                <React.Fragment key={c.id}>
                                    {/* The Main Visible Row */}
                                    <tr
                                        onClick={() => toggleRow(c.id)}
                                        className="clickable-row"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className="tracking-id">{c.tracking_number}</td>
                                        <td>{c.patient_name}</td>
                                        <td className="status-badge">
                                            {/* Make the text color red if High Risk, otherwise normal */}
                                            <span style={{ color: c.status === 'High Risk' ? '#e63946' : 'inherit', fontWeight: c.status === 'High Risk' ? 'bold' : 'normal' }}>
                                                {c.status}
                                            </span>
                                            {c.status !== 'Pending Triage' && ' ▾'}
                                        </td>
                                    </tr>

                                    {/* The Hidden Dropdown Row */}
                                    {expandedRowId === c.id && (
                                        <tr className="expanded-note-row">
                                            <td colSpan="3" style={{ padding: '1rem', backgroundColor: '#1a1a20', borderLeft: '4px solid #4da8da' }}>
                                                <strong>👨‍⚕️ Dr. Smith's Note:</strong>
                                                <p style={{ marginTop: '0.5rem', color: '#ccc' }}>
                                                    {c.surgeon_note || "No clinical note provided for this case."}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Profile;