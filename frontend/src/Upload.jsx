import { useState } from 'react';
import axios from 'axios';

function Upload() {
    const [patientName, setPatientName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [residentialDistrict, setResidentialDistrict] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState('Male');
    const [habit, setHabit] = useState('None');
    const [file, setFile] = useState(null);

    const [statusMessage, setStatusMessage] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        setStatusMessage('Uploading...');

        const formData = new FormData();
        formData.append('patient_name', patientName);
        formData.append('contact_number', contactNumber);
        formData.append('residential_district', residentialDistrict);
        formData.append('age', age);
        formData.append('sex', sex);
        formData.append('habit', habit);
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');

            const response = await axios.post('http://localhost:8000/api/upload', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setStatusMessage('Success! Patient case securely filed.');
            setPatientName(''); setContactNumber(''); setResidentialDistrict('');
            setAge(''); setSex('Male'); setHabit('None'); setFile(null);

        } catch (err) {
            console.error(err);
            setStatusMessage('Upload failed. Check the backend connection.');
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '50px auto' }}>
            <h2 style={{ textAlign: 'center' }}>Primary Care Capture Portal</h2>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#222', padding: '20px', borderRadius: '8px', color: 'white' }}>

                <label>Patient Name:</label>
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />

                <label>Contact Number (10 digits):</label>
                <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, ''))}
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Please enter exactly 10 digits"
                    required
                />

                <label>Residential District:</label>
                <select value={residentialDistrict} onChange={(e) => setResidentialDistrict(e.target.value)} required>
                    <option value="" disabled>Select a District...</option>
                    <option value="Ampara">Ampara</option>
                    <option value="Anuradhapura">Anuradhapura</option>
                    <option value="Badulla">Badulla</option>
                    <option value="Batticaloa">Batticaloa</option>
                    <option value="Colombo">Colombo</option>
                    <option value="Galle">Galle</option>
                    <option value="Gampaha">Gampaha</option>
                    <option value="Hambantota">Hambantota</option>
                    <option value="Jaffna">Jaffna</option>
                    <option value="Kalutara">Kalutara</option>
                    <option value="Kandy">Kandy</option>
                    <option value="Kegalle">Kegalle</option>
                    <option value="Kilinochchi">Kilinochchi</option>
                    <option value="Kurunegala">Kurunegala</option>
                    <option value="Mannar">Mannar</option>
                    <option value="Matale">Matale</option>
                    <option value="Matara">Matara</option>
                    <option value="Moneragala">Moneragala</option>
                    <option value="Mullaitivu">Mullaitivu</option>
                    <option value="Nuwara Eliya">Nuwara Eliya</option>
                    <option value="Polonnaruwa">Polonnaruwa</option>
                    <option value="Puttalam">Puttalam</option>
                    <option value="Ratnapura">Ratnapura</option>
                    <option value="Trincomalee">Trincomalee</option>
                    <option value="Vavuniya">Vavuniya</option>
                </select>

                <label>Age (1-100):</label>
                <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="1"
                    max="100"
                    required
                />

                <label>Sex:</label>
                <select value={sex} onChange={(e) => setSex(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>

                <label>Habit (Risk Factor):</label>
                <select value={habit} onChange={(e) => setHabit(e.target.value)}>
                    <option value="None">None</option>
                    <option value="Smoking">Smoking</option>
                    <option value="Betel Chewing">Betel Chewing</option>
                    <option value="Alcohol">Alcohol</option>
                </select>

                <label style={{ marginTop: '10px' }}>Clinical Image (Oral Cavity):</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />

                <button type="submit" style={{ padding: '10px', marginTop: '15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', fontWeight: 'bold' }}>
                    Submit Patient Case
                </button>
            </form>

            {statusMessage && <p style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold', color: statusMessage.includes('Success') ? '#4CAF50' : '#ff6b6b' }}>{statusMessage}</p>}
        </div>
    );
}

export default Upload;