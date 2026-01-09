import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils, faMobile, faChartLine } from '@fortawesome/free-solid-svg-icons';
import './Login.css';

const Login = () => {
  const { login, forgotPassword } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Login form submitted');

    try {
      const result = await login(loginId, password);
      
      console.log('📥 Login result:', result);

      if (result.success) {
        console.log('✅ Login successful! Navigating to dashboard...');
        
        // Force navigation to dashboard
        window.location.href = '/admin';
        
        // Don't set loading to false - page will reload
      } else {
        console.log('❌ Login failed:', result.error);
        setError(result.error || 'Login failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('💥 Unexpected error during login:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setForgotPasswordMessage('');

    try {
      const result = await forgotPassword(forgotPasswordEmail);
      if (result.success) {
        setForgotPasswordMessage('OTP sent successfully to your email!');
        setTimeout(() => setShowForgotPassword(false), 3000);
      } else {
        setForgotPasswordMessage(result.error);
      }
    } catch (err) {
      setForgotPasswordMessage('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg-pattern"></div>
      
      <div className="login-content fade-in">
        <div className="login-card card-elevated">
          <div className="login-header">
            <div className="login-logo">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" stroke="var(--accent)" strokeWidth="2"/>
                <path d="M20 25 L30 15 L40 25 M30 15 L30 40 M25 35 L35 35" 
                      stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1>Dining Reservations</h1>
            <p className="login-subtitle">Welcome back to your restaurant management</p>
          </div>

          {!showForgotPassword ? (
            <form onSubmit={handleLogin} className="login-form">
              {error && (
                <div className="alert alert-error fade-in">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="loginId" className="input-label">
                  Email / Username / Phone
                </label>
                <input
                  id="loginId"
                  type="text"
                  className="input"
                  placeholder="Enter your credentials"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="button"
                className="forgot-password-link"
                onClick={() => setShowForgotPassword(true)}
                disabled={loading}
              >
                Forgot Password?
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: '20px', height: '20px' }}></span>
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                New users must be added by an administrator
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="login-form">
              <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Reset Password</h3>
              
              {forgotPasswordMessage && (
                <div className={`alert ${forgotPasswordMessage.includes('success') ? 'alert-success' : 'alert-error'} fade-in`}>
                  {forgotPasswordMessage}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="forgotEmail" className="input-label">
                  Email / Username / Phone
                </label>
                <input
                  id="forgotEmail"
                  type="text"
                  className="input"
                  placeholder="Enter your credentials"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordMessage('');
                  }}
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>
          )}

          <div className="login-footer">
            <p>For customer table bookings, scan the QR code at your table</p>
          </div>
        </div>

        <div className="login-features">
          <div className="feature-card fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="feature-icon"><FontAwesomeIcon icon={faUtensils} /></div>
            <h4>Multi-Restaurant</h4>
            <p>Manage multiple locations from one dashboard</p>
          </div>
          <div className="feature-card fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="feature-icon"><FontAwesomeIcon icon={faMobile} /></div>
            <h4>Table Booking</h4>
            <p>Seamless customer experience at each table</p>
          </div>
          <div className="feature-card fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="feature-icon"><FontAwesomeIcon icon={faChartLine} /></div>
            <h4>Real-time Orders</h4>
            <p>Track and manage orders instantly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
