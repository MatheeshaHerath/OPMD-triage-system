import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // 1. Package the credentials
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            // 2. Send to the FastAPI vault
            const response = await axios.post('http://localhost:8000/api/login', formData);
            const token = response.data.access_token;

            // 3. Save the badge in the browser's secure memory
            localStorage.setItem('token', token);

            // --- THE TRAFFIC COP LOGIC ---
            // 4. Crack open the JWT to read the user's role
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userRole = payload.role;

            alert(`Login Successful! Welcome to the system, ${userRole}.`);

            // 5. Direct traffic based on the role
            if (userRole === 'surgeon') {
                navigate('/dashboard'); // Send doctors to the review dashboard
            } else {
                navigate('/upload');    // Send midwives to the patient upload form
            }

        } catch (err) {
            setError('Invalid username or password');
            console.error(err);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center' }}>
            <h2>System Login</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ padding: '10px', fontSize: '16px', backgroundColor: '#333', color: '#fff', border: '1px solid #555' }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ padding: '10px', fontSize: '16px', backgroundColor: '#333', color: '#fff', border: '1px solid #555' }}
                />
                <button type="submit" style={{ padding: '10px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', fontWeight: 'bold' }}>
                    Secure Login
                </button>
            </form>
            {error && <p style={{ color: '#ff6b6b', marginTop: '15px', fontWeight: 'bold' }}>{error}</p>}
        </div>
    );
}

export default Login;