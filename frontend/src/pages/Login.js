import React, { useState } from 'react';
import { auth } from '../utils/api';

const Login = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOTPStep, setShowOTPStep] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sendOTP = async () => {
    if (!formData.email) {
      setError('Please enter your email');
      return;
    }
    
    try {
      const response = await auth.sendOTP(formData.email);
      if (response.data.otp) {
        // Fallback mode - email failed
        setMessage(`Email failed. Your OTP: ${response.data.otp}`);
      } else {
        // Success - email sent
        setMessage('OTP sent to your email! Check your inbox.');
      }
      setShowOTPStep(true);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      if (showForgotPassword) {
        const response = await auth.forgotPassword(formData.email);
        setMessage(`Reset link: ${response.data.resetLink}`);
        console.log('Reset Link:', response.data.resetLink);
        return;
      }
      
      if (!isLogin && !showOTPStep) {
        // For registration, first send OTP
        sendOTP();
        return;
      }
      
      const response = isLogin 
        ? await auth.login({ email: formData.email, password: formData.password })
        : await auth.register(formData);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setUser(response.data.user);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Connection error';
      setError(errorMessage);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
          {showForgotPassword ? 'Reset Password' : (isLogin ? 'Login' : 'Register')} - GD Platform
        </h2>
        
        {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        {message && <div style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{message}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && !showForgotPassword && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            required
          />
          
          {!showForgotPassword && (
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
          )}
          
          {!isLogin && showOTPStep && (
            <input
              type="text"
              placeholder="Enter OTP"
              value={formData.otp}
              onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }}
              maxLength="6"
              required
            />
          )}
          
          <button
            type="submit"
            style={{ width: '100%', padding: '0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {showForgotPassword ? 'Send Reset Link' : 
             (isLogin ? 'Login' : 
              (showOTPStep ? 'Verify OTP & Register' : 'Send OTP'))}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          {!showForgotPassword ? (
            <>
              <p>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {isLogin ? 'Register' : 'Login'}
                </button>
              </p>
              {isLogin && (
                <button
                  onClick={() => setShowForgotPassword(true)}
                  style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Forgot Password?
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => { setShowForgotPassword(false); setMessage(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;