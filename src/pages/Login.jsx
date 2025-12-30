import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            console.log("Logged in as:", user.displayName);
            navigate('/user');
        } catch (error) {
            console.error("Google Login Error:", error);
            setError("Google Login Failed: " + error.message);
        }
    };

    const handleEmailLogin = (e) => {
        e.preventDefault();
        setError('');

        // Mock Email Login
        if (email === 'admin@spw.com' && password === 'admin') {
            navigate('/admin');
        } else if (email && password) {
            navigate('/user');
        } else {
            setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>เข้าสู่ระบบ</h1>
                    <p>เข้าสู่ระบบเพื่อทำการจองกิจกรรมของคุณ</p>
                </div>

                {!showEmailForm ? (
                    <>
                        <button className="google-btn" onClick={handleGoogleLogin}>
                            <img
                                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                alt="Google G"
                                className="google-icon"
                            />
                            Sign in with Google
                        </button>
                    </>
                ) : (
                    <form className="login-form" onSubmit={handleEmailLogin}>
                        <div className="input-group">
                            <label>อีเมล</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="login-input"
                            />
                        </div>

                        <div className="input-group">
                            <label>รหัสผ่าน</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input"
                            />
                        </div>

                        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}

                        <button type="submit" className="submit-btn">เข้าสู่ระบบ</button>
                        <button
                            type="button"
                            className="back-btn"
                            onClick={() => setShowEmailForm(false)}
                        >
                            ย้อนกลับ
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
