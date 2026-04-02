import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Upload from './Upload';
import Dashboard from './Dashboard';
import Profile from './Profile'; // 1. WE IMPORTED THE NEW PROFILE HERE
import Navbar from './Navbar';
import CaseDetail from './CaseDetail';

function App() {
  return (
    <Router>
      {/* The Navbar sits at the very top, watching every page */}
      <Navbar />

      <Routes>
        {/* The Front Door */}
        <Route path="/" element={<Login />} />

        {/* The Nurse's Data Capture Portal */}
        <Route path="/upload" element={<Upload />} />

        {/* The Surgeon's Queue */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* The Surgeon's Dedicated Case Review Page */}
        <Route path="/case/:id" element={<CaseDetail />} />

        {/* The Midwife's Activity Profile */}
        <Route path="/profile" element={<Profile />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
export default App;