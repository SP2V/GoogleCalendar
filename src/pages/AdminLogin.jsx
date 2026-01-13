import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../services/firebase';
import './Login.css';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            handleCustomTokenLogin(token);
        }
    }, [searchParams]);

    const handleCustomTokenLogin = async (token) => {
        setLoading(true);
        try {
            const result = await signInWithCustomToken(auth, token);
            const user = result.user;
            console.log("Admin Logged in as:", user.displayName);

            // Grant Admin Access
            localStorage.setItem('isAdminLoggedIn', 'true');
            localStorage.setItem('sessionRole', 'admin');

            // Clean URL
            window.history.replaceState({}, document.title, "/admin-login");

            navigate('/admin');
        } catch (err) {
            console.error("Custom Token Login Error:", err);
            setError("Login Failed: " + err.message);
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Redirect to Backend Server to start full OAuth flow (Offline Access)
        // This ensures the backend gets the Refresh Token it needs for Sync.
        window.location.href = 'http://localhost:3000/auth/google';
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>ผู้ดูแลระบบ</h1>
                    <p>เข้าสู่ระบบเพื่อจัดการระบบ</p>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p>กำลังเข้าสู่ระบบ...</p>
                    </div>
                ) : (
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
                )}

                {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</p>}
            </div>
        </div>
    );
};

export default AdminLogin;
