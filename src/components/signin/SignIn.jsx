import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, database } from '../../firebaseConfig'; // Import Firestore and Realtime Database
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, set, get, serverTimestamp, onDisconnect } from 'firebase/database';
import SignLogo from '../../assets/xrai.png'; // Your logo image

import './SignIn.css'; // Your original CSS file with custom styles

const SignIn = ({ onSignIn }) => {
  const [licenseId, setLicenseId] = useState('');
  const [licensePassword, setLicensePassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Generate a unique session ID for this login attempt
  const generateSessionId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting to sign in with license credentials...');
      const licensesRef = collection(db, 'licenses');
      const q = query(
        licensesRef,
        where('licenseId', '==', licenseId),
        where('password', '==', licensePassword)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid License ID or Password');
        setIsLoading(false);
        return;
      }

      const doc = querySnapshot.docs[0];
      const docData = doc.data();
      
      // Check for existing active session
      const sessionRef = ref(database, `active_sessions/${licenseId}`);
      const sessionSnapshot = await get(sessionRef);
      
      if (sessionSnapshot.exists()) {
        const sessionData = sessionSnapshot.val();
        const currentTime = Date.now();
        const sessionTime = sessionData.timestamp || 0;
        const timeDifference = currentTime - sessionTime;
        
        // If session is less than 5 minutes old, consider it active
        // You can adjust this timeout as needed
        if (timeDifference < 5 * 60 * 1000) { // 5 minutes
          setError('This license is already in use on another device. Please try again later or contact support.');
          setIsLoading(false);
          return;
        }
      }

      const user = {
        uid: licenseId,
        companyName: docData.companyName,
      };

      console.log('License authenticated. Constructed user:', user);

      // Generate unique session ID for this login
      const sessionId = generateSessionId();

      // Set active session with timestamp and session info
      const sessionData = {
        sessionId: sessionId,
        timestamp: Date.now(),
        deviceInfo: navigator.userAgent,
        loginTime: new Date().toISOString()
      };

      await set(sessionRef, sessionData);

      // Set up automatic session cleanup on disconnect
      const sessionDisconnectRef = onDisconnect(sessionRef);
      sessionDisconnectRef.remove();

      const userRef = ref(database, `active_users/${user.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.exists() ? snapshot.val() : null;

      const newUserData = userData
        ? { 
            ...userData,
            sessionId: sessionId,
            lastActive: Date.now()
          }
        : {
            status: 'available',
            incoming_calls: [],
            chats: [],
            sessionId: sessionId,
            lastActive: Date.now()
          };

      console.log('Data being written to Realtime Database:', newUserData);

      await set(userRef, newUserData);

      // Set up automatic user cleanup on disconnect
      const userDisconnectRef = onDisconnect(userRef);
      userDisconnectRef.remove();

      // Store session ID in sessionStorage for cleanup on page unload
      sessionStorage.setItem('currentSessionId', sessionId);
      sessionStorage.setItem('currentLicenseId', licenseId);

      onSignIn(user);
      navigate('/dashboard', { state: { userId: user.uid, companyName: user.companyName } });
    } catch (err) {
      console.error('Error during sign-in with license:', err);
      setError('An error occurred during sign-in.');
      setIsLoading(false);
    }
  };

  // Add cleanup on component unmount or page unload
  React.useEffect(() => {
    const handleBeforeUnload = async () => {
      const sessionId = sessionStorage.getItem('currentSessionId');
      const licenseId = sessionStorage.getItem('currentLicenseId');
      
      if (sessionId && licenseId) {
        try {
          const sessionRef = ref(database, `active_sessions/${licenseId}`);
          const userRef = ref(database, `active_users/${licenseId}`);
          
          // Clean up session and user data
          await set(sessionRef, null);
          await set(userRef, null);
        } catch (error) {
          console.error('Error cleaning up session:', error);
        }
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div
        className="signin-card bg-blue-900 w-full sm:w-96 p-8 rounded-lg border-4 border-white shadow-xl"
        style={{ boxShadow: '0 0 2px 1px rgba(255, 255, 255, 0.6)' }}
      >
        <div className="signin-logo-container flex justify-center mb-6">
          <div className="signin-logo w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex justify-center items-center mb-4">
            <img src={SignLogo} alt="XRAI Vision Logo" className="w-12 h-12 object-contain" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-4">Provider Sign In</h2>

        <form onSubmit={handleSubmit}>
          <div className="signin-input-group mb-4">
            <label htmlFor="licenseId" className="block text-sm font-semibold text-gray-300">
              License ID
            </label>
            <div className="signin-input-container relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                id="licenseId"
                type="text"
                placeholder="Enter License ID"
                value={licenseId}
                onChange={(e) => setLicenseId(e.target.value)}
                className="w-full pl-10 py-3 bg-gray-800 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="signin-input-group mb-4">
            <label htmlFor="licensePassword" className="block text-sm font-semibold text-gray-300">
              License Password
            </label>
            <div className="signin-input-container relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                id="licensePassword"
                type="password"
                placeholder="Enter License Password"
                value={licensePassword}
                onChange={(e) => setLicensePassword(e.target.value)}
                className="w-full pl-10 py-3 bg-gray-800 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

          <button
            type="submit"
            className={`w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex justify-center items-center space-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    d="M4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></path>
                </svg>
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Link to Admin Dashboard */}
        {/* <div className="flex justify-end mt-4 pr-0.5">
          <a
            href="https://client-admin-6ac45.web.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-500 text-white px-2 py-2 rounded border border-white border-opacity-35 hover:bg-blue-700 ml-8"
          >
            Admin Login
          </a>
        </div> */}
        
        <div className="flex justify-between items-center text-sm text-gray-500 mt-4">
          <a href="#forgot-password" className="hover:text-blue-500">
            Forgot Password?
          </a>
          <div className="flex items-center space-x-2">
            <span>Powered by</span>
            <img
              src="https://via.placeholder.com/60"
              alt="Agili8"
              className="w-12 h-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;