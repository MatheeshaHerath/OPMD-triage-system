import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Dashboard() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
    const navigate = useNavigate();

    // We pull the fetch logic OUTSIDE the useEffect so the manual button can use it too
    const fetchCases = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/cases');
            const data = await response.json();
            setCases(data);
            setLastRefreshed(new Date().toLocaleTimeString()); // Update the timestamp
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        // 1. Fetch immediately when the page loads
        fetchCases();

        // 2. Set up the 10-second polling timer (10000 milliseconds)
        const intervalId = setInterval(() => {
            fetchCases();
        }, 10000);

        // 3. CRITICAL: Cleanup the timer if the doctor clicks away to another page
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', marginBottom: '2rem' }}>
                <h2 style={{ borderBottom: 'none', marginBottom: 0 }}>Surgeon's Triage Queue</h2>

                {/* The Manual Refresh UI */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <small style={{ color: '#888' }}>Last updated: {lastRefreshed}</small>
                    <button
                        onClick={fetchCases}
                        className="view-btn"
                        style={{ backgroundColor: '#333', color: 'white', padding: '0.4rem 0.8rem' }}
                    >
                        ↻ Refresh Now
                    </button>
                </div>
            </div>

            {loading ? (
                <p style={{ color: 'white' }}>Loading patient data...</p>
            ) : (
                <div className="queue-table-section">
                    <table className="medical-table">
                        <thead>
                            <tr>
                                <th>Tracking ID</th>
                                <th>Patient Name</th>
                                <th>Risk Factor</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cases.map((c) => (
                                <tr key={c.id}>
                                    <td className="tracking-id">{c.tracking_number}</td>
                                    <td>{c.patient_name}</td>
                                    <td>{c.habit}</td>
                                    <td className="status-pending">{c.status}</td>
                                    <td>
                                        <button
                                            className="view-btn"
                                            onClick={() => navigate(`/case/${c.id}`, { state: { patientCase: c } })}
                                        >
                                            Review Case
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Dashboard;