import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, setPersistence, browserSessionPersistence } from 'firebase/auth'; // Import Persistence
import { userAuth, googleProvider } from '../services/firebase';
import { GoogleAuthProvider } from 'firebase/auth';
import './Login.css';

const UserLogin = () => {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    // Capture Admin Email from URL if present
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const adminEmail = params.get('admin');
        if (adminEmail) {
            sessionStorage.setItem('targetAdminEmail', adminEmail); // Use sessionStorage
            console.log("Target Admin set in sessionStorage:", adminEmail);
        }
    }, []);

    const handleGoogleLogin = async () => {
        try {
            console.log("Starting Login...", { userAuth, googleProvider, browserSessionPersistence });

            // Try explicit persistence set again (since we reverted to getAuth)
            try {
                await setPersistence(userAuth, browserSessionPersistence);
                console.log("Persistence set successfully");
            } catch (pErr) {
                console.error("setPersistence Failed:", pErr);
                // Continue anyway to see if login works without it
            }

            // Add Calendar Scope
            googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

            const result = await signInWithPopup(userAuth, googleProvider);

            // Get Access Token
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            if (token) {
                sessionStorage.setItem('googleAccessToken', token);
            }

            const user = result.user;
            console.log("Logged in as:", user.displayName);
            sessionStorage.setItem('sessionRole', 'user'); // Use sessionStorage
            navigate('/user');
        } catch (error) {
            console.error("Google Login Error:", error);
            setError("Google Login Failed: " + error.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>ยินดีต้อนรับ</h1>
                    <p>เข้าสู่ระบบเพื่อทำการจองกิจกรรมของคุณ</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button className="google-btn" onClick={handleGoogleLogin}>
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google G"
                            className="google-icon"
                        />
                        Sign in with Google
                    </button>
                </div>

                {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</p>}

                {/* Link to Admin Login */}
                {/* <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <span
                        style={{ color: '#999', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => navigate('/admin-login')}
                    >
                        สำหรับผู้ดูแลระบบ
                    </span>
                </div> */}
            </div>
        </div>
    );
};

export default UserLogin;
