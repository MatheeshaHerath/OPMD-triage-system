import { useState, useEffect } from 'react';
import './App.css';

function Dashboard() {
    const [patientCases, setPatientCases] = useState([]);
    const [error, setError] = useState("");

    // This hook automatically fetches the data the moment the page loads
    useEffect(() => {
        const fetchCases = async () => {
            try {
                const response = await fetch("http://localhost:8000/api/cases");
                if (!response.ok) {
                    throw new Error("Failed to connect to the database vault.");
                }
                const data = await response.json();
                setPatientCases(data); // Save the JSON array into our React state
            } catch (err) {
                setError(err.message);
            }
        };

        fetchCases();
    }, []);

    return (
        <div className="dashboard-container">
            <h2>Surgeon's Triage Dashboard</h2>

            {error && <p className="error-text">{error}</p>}

            <div className="table-wrapper">
                <table className="triage-table">
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Date Filed</th>
                            <th>Patient Name</th>
                            <th>Demographics</th>
                            <th>Risk Habit</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patientCases.map((c) => (
                            <tr key={c.id}>
                                <td className="tracking-id">{c.tracking_number}</td>
                                <td>{new Date(c.date_filed).toLocaleDateString()}</td>
                                <td>{c.patient_name}</td>
                                <td>{c.age} yrs | {c.sex} | {c.residential_district}</td>
                                <td>{c.habit}</td>
                                <td className="status-badge">{c.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* If the database is empty, show a friendly message */}
                {patientCases.length === 0 && !error && (
                    <p className="empty-state">No patient cases pending triage.</p>
                )}
            </div>
        </div>
    );
}

export default Dashboard;