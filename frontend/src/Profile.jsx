import { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css'; // Imports the core heatmap styles
import './App.css';

function Profile() {
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch("http://localhost:8000/api/profile/midwife");
                if (!response.ok) throw new Error("Failed to fetch profile data");
                const data = await response.json();
                setProfile(data);
            } catch (err) {
                setError(err.message);
            }
        };
        fetchProfile();
    }, []);

    if (error) return <div className="error-text">{error}</div>;
    if (!profile) return <div className="loading">Loading Profile...</div>;

    // Calculate dates for the calendar (show the last 4 months)
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
                    values={profile.calendar_data}
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
                <h3>Recent Case Uploads</h3>
                <table className="triage-table">
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Patient Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profile.recent_queue.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center' }}>No recent uploads</td></tr>
                        ) : (
                            profile.recent_queue.map((c) => (
                                <tr key={c.id}>
                                    <td className="tracking-id">{c.tracking_number}</td>
                                    <td>{c.patient_name}</td>
                                    <td className="status-badge">{c.status}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Profile;