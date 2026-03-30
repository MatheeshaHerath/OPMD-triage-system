import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Upload from './Upload';
import Dashboard from './Dashboard';
import Profile from './Profile'; // 1. WE IMPORTED THE NEW PROFILE HERE

function App() {
  return (
    <Router>
      <Routes>
        {/* The Front Door */}
        <Route path="/" element={<Login />} />

        {/* The Nurse's Data Capture Portal */}
        <Route path="/upload" element={<Upload />} />

        {/* The Surgeon's Queue */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* The Midwife's Activity Profile */}
        <Route path="/profile" element={<Profile />} /> {/* 2. WE ADDED THE NEW ROUTE HERE */}

        {/* Catch-all: If someone types a random URL, send them back to login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;