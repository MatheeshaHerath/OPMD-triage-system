import { Link, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Hide the Navbar entirely on the login screen
    if (location.pathname === '/') {
        return null;
    }

    const handleLogout = () => {
        navigate('/');
    };

    // 2. Check which part of the hospital we are in
    const isSurgeonView = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/case');

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                🩺 OPMD Triage System
            </div>
            <div className="navbar-links">

                {/* 3. Render different links based on the view! */}
                {isSurgeonView ? (
                    // --- SURGEON LINKS ---
                    <Link to="/dashboard" className="nav-link">Triage Queue</Link>
                ) : (
                    // --- NURSE LINKS ---
                    <>
                        <Link to="/upload" className="nav-link">Upload Portal</Link>
                        <Link to="/profile" className="nav-link">My Profile</Link>
                    </>
                )}

                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
        </nav>
    );
}

export default Navbar;