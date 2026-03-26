import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // This is our React routing engine
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Package the credentials exactly how FastAPI expects them
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch('http://localhost:8000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Invalid username or password');
            }

            // 1. Catch the VIP Badge from FastAPI
            const data = await response.json();
            const token = data.access_token;

            // 2. Lock the badge in the browser's safe (so they stay logged in)
            localStorage.setItem('token', token);

            // 3. Crack open the JWT badge to read the secret payload
            // A JWT has 3 parts separated by dots. The payload is the middle part [1].
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payloadBase64));
            const userRole = decodedPayload.role;

            // 4. THE TRAFFIC COP LOGIC
            if (userRole === 'surgeon') {
                navigate('/dashboard'); // Send doctors to the queue
            } else if (userRole === 'midwife') {
                navigate('/upload');    // Send nurses to the capture portal
            } else {
                setError('Unknown security clearance.');
            }

        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="login-container">
            <form onSubmit={handleLogin} className="login-form">
                <h2>System Login</h2>

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit" className="login-button">Secure Login</button>

                {error && <p className="error-text">{error}</p>}
            </form>
        </div>
    );
}

export default Login;