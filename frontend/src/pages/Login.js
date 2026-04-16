import React, { useState } from 'react';
import { auth } from '../utils/api';

const Login = ({ setUser }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [step, setStep] = useState(1); // register: 1=details, 2=otp
  const [formData, setFormData] = useState({ name: '', email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = (newMode) => {
    setMode(newMode);
    setStep(1);
    setError('');
    setMessage('');
    setFormData({ name: '', email: '', password: '', otp: '' });
  };

  const handleSendOTP = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.sendOTP(formData.email);
      setMessage(`OTP sent to ${formData.email} — check your inbox`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.otp) { setError('Enter the OTP'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await auth.register(formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await auth.login({ email: formData.email, password: formData.password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.forgotPassword(formData.email);
      setMessage(`Reset link sent! Check your email.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', marginBottom: '1rem',
    border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem',
    boxSizing: 'border-box'
  };

  const btnStyle = {
    width: '100%', padding: '0.75rem', background: '#007bff',
    color: 'white', border: 'none', borderRadius: '6px',
    cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem',
    opacity: loading ? 0.7 : 1
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '420px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
          <h2 style={{ margin: 0, color: '#333' }}>GD Platform</h2>
          <p style={{ color: '#666', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
            {mode === 'login' && 'Welcome back!'}
            {mode === 'register' && (step === 1 ? 'Create your account' : 'Verify your email')}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
            ❌ {error}
          </div>
        )}
        {message && (
          <div style={{ background: '#d4edda', color: '#155724', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
            ✅ {message}
          </div>
        )}

        {/* LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email address" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle} required />
            <input type="password" placeholder="Password" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={inputStyle} required />
            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={() => reset('forgot')}
                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.9rem' }}>
                Forgot Password?
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
              Don't have an account?{' '}
              <button type="button" onClick={() => reset('register')}
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>
                Register
              </button>
            </div>
          </form>
        )}

        {/* REGISTER - Step 1: Fill details */}
        {mode === 'register' && step === 1 && (
          <div>
            <input type="text" placeholder="Full Name" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle} />
            <input type="email" placeholder="Email address" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle} />
            <input type="password" placeholder="Password" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={inputStyle} />
            <button onClick={handleSendOTP} style={btnStyle} disabled={loading}>
              {loading ? 'Sending OTP...' : '📧 Send OTP to Email'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => reset('login')}
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>
                Login
              </button>
            </div>
          </div>
        )}

        {/* REGISTER - Step 2: Enter OTP */}
        {mode === 'register' && step === 2 && (
          <form onSubmit={handleRegister}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem' }}>📬</div>
              <p style={{ color: '#555', margin: '0.5rem 0 0 0' }}>
                We sent a 6-digit OTP to<br />
                <strong style={{ color: '#007bff' }}>{formData.email}</strong>
              </p>
            </div>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={formData.otp}
              onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              style={{ ...inputStyle, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' }}
              maxLength="6"
              required
            />
            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? 'Verifying...' : '✅ Verify & Register'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={handleSendOTP} disabled={loading}
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.9rem' }}>
                Resend OTP
              </button>
              {' · '}
              <button type="button" onClick={() => { setStep(1); setError(''); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.9rem' }}>
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <input type="email" placeholder="Enter your email" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle} required />
            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? 'Sending...' : '📧 Send Reset Link'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button type="button" onClick={() => reset('login')}
                style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '0.9rem' }}>
                ← Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
