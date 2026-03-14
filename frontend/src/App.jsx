import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Upload from './Upload'; // <--- 1. Import the new component

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/upload" element={<Upload />} /> {/* <--- 2. Swap the dummy text for the real portal */}
          <Route path="/dashboard" element={<h2>Medical Officer Review Dashboard</h2>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;