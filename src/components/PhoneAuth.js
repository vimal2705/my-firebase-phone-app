import React, { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from './firebase';

const PhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cleanup reCAPTCHA on component unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Setup reCAPTCHA with better error handling
  const setupRecaptcha = () => {
    // Clear existing verifier first
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response) => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          setError('reCAPTCHA expired. Please try again.');
        }
      });
    } catch (error) {
      console.error('reCAPTCHA setup failed:', error);
      setError('reCAPTCHA setup failed. Please refresh the page.');
    }
  };

  // Validate phone number format
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  // Send OTP with better error handling
  const sendOtp = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Wait a bit to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setupRecaptcha();
      
      if (!window.recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      setConfirmationResult(confirmation);
      setError('');
      console.log('OTP sent successfully');
      
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // Handle specific error types
      if (error.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format');
      } else if (error.code === 'auth/missing-phone-number') {
        setError('Phone number is required');
      } else if (error.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded. Please try again later');
      } else if (error.code === 'auth/user-disabled') {
        setError('This phone number has been disabled');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Phone authentication is not enabled');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later');
      } else {
        setError(error.message || 'Failed to send OTP. Please try again.');
      }
      
      // Clear reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP with better error handling
  const verifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    if (!confirmationResult) {
      setError('No confirmation result available. Please request OTP again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await confirmationResult.confirm(otp);
      setUser(result.user);
      console.log('User signed in successfully:', result.user);
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      if (error.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP. Please check and try again.');
      } else if (error.code === 'auth/code-expired') {
        setError('OTP has expired. Please request a new one.');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset all states
  const resetStates = () => {
    setConfirmationResult(null);
    setPhoneNumber('');
    setOtp('');
    setError('');
    setLoading(false);
    
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
      resetStates();
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
    }
  };

  if (user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>✅ Authentication Successful!</h2>
          <div style={styles.userInfo}>
            <p><strong>Phone:</strong> {user.phoneNumber}</p>
            <p><strong>UID:</strong> {user.uid.substring(0, 8)}...</p>
            <p><strong>Created:</strong> {new Date(user.metadata.creationTime).toLocaleDateString()}</p>
          </div>
          <button onClick={signOut} style={styles.button}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📱 Phone Authentication</h2>
        
        {error && (
          <div style={styles.errorContainer}>
            <p style={styles.error}>{error}</p>
          </div>
        )}

        {!confirmationResult ? (
          <div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                placeholder="+1234567890 (include country code)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              <small style={styles.hint}>
                Include country code (e.g., +1 for US, +91 for India)
              </small>
            </div>
            
            <button 
              onClick={sendOtp} 
              disabled={loading || !phoneNumber.trim()}
              style={{
                ...styles.button,
                opacity: loading || !phoneNumber.trim() ? 0.6 : 1
              }}
            >
              {loading ? '📤 Sending...' : '📤 Send OTP'}
            </button>
          </div>
        ) : (
          <div>
            <div style={styles.successContainer}>
              <p style={styles.success}>✅ OTP sent to {phoneNumber}</p>
              <small style={styles.hint}>Check your messages and enter the 6-digit code</small>
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Verification Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{...styles.input, ...styles.otpInput}}
                maxLength="6"
                disabled={loading}
              />
            </div>
            
            <button 
              onClick={verifyOtp} 
              disabled={loading || otp.length !== 6}
              style={{
                ...styles.button,
                opacity: loading || otp.length !== 6 ? 0.6 : 1
              }}
            >
              {loading ? '🔄 Verifying...' : '✅ Verify OTP'}
            </button>
            
            <button 
              onClick={resetStates}
              style={styles.secondaryButton}
              disabled={loading}
            >
              ↩️ Change Phone Number
            </button>
          </div>
        )}

        {/* reCAPTCHA container - keep at bottom */}
        <div id="recaptcha-container" style={{ marginTop: '20px' }}></div>
      </div>
    </div>
  );
};

// Enhanced styles
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid #e9ecef'
  },
  title: {
    textAlign: 'center',
    marginBottom: '2rem',
    color: '#2c3e50',
    fontSize: '1.5rem',
    fontWeight: '600'
  },
  inputGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#495057',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
    outline: 'none'
  },
  otpInput: {
    textAlign: 'center',
    fontSize: '1.5rem',
    letterSpacing: '0.5rem',
    fontWeight: '600'
  },
  button: {
    width: '100%',
    padding: '14px',
    margin: '8px 0',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    outline: 'none'
  },
  secondaryButton: {
    width: '100%',
    padding: '12px',
    margin: '8px 0',
    backgroundColor: 'transparent',
    color: '#6c757d',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '1rem'
  },
  error: {
    color: '#721c24',
    margin: 0,
    fontSize: '14px'
  },
  successContainer: {
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  success: {
    color: '#155724',
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: '500'
  },
  hint: {
    color: '#6c757d',
    fontSize: '12px',
    display: 'block',
    marginTop: '4px'
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  }
};

export default PhoneAuth;