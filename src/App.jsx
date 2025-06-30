// import React, { useState } from 'react';
// import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import SignIn from './components/signin/SignIn';
// import Dashboard from './components/dashboard/Dashboard';
// import VideoCall from './components/videocalling/VideoCall';
// import VideoCallTailwind from './components/videocalling/VideoCallTailWind'

// const App = () => {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [user, setUser] = useState(null); // Track the user object

//   // Handle user authentication state
//   const handleSignIn = (user) => {
//     setIsAuthenticated(true);
//     setUser(user); // Set the user object when authenticated
//   };

//   // Handle user logout
//   const handleLogout = () => {
//     setIsAuthenticated(false);
//     setUser(null); // Clear the user object on logout
//   };

//   return (
//     <Router>
//       <Routes>
//         {/* If not authenticated, go to sign-in, else redirect to dashboard */}
//         <Route
//           path="/"
//           element={
//             !isAuthenticated ? (
//               <SignIn onSignIn={handleSignIn} />
//             ) : (
//               <Navigate to="/dashboard" />
//             )
//           }
//         />

//         {/* Dashboard route */}
//         <Route
//           path="/dashboard"
//           element={
//             isAuthenticated ? (
//               <Dashboard user={user} onLogout={handleLogout} />
//             ) : (
//               <Navigate to="/" />
//             )
//           }
//         />

//         {/* Video call route */}
//         <Route
//           path="/video-call"
//           element={
//             isAuthenticated ? (
//               <VideoCallTailwind user={user} />
//             ) : (
//               <Navigate to="/" />
//             )
//           }
//         />
//       </Routes>
//     </Router>
//   );
// };

// export default App;






import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './components/signin/SignIn';
import Dashboard from './components/dashboard/Dashboard';
import VideoCall12 from './components/videocalling/VideoCallTailwind12';
// import AdminDashboard from './components/adim/AdminDashboard';
import MainPage from './components/MainPage';
import VideoCallingWithARHand from './components/videocalling/VideoCallingWithARHand';


const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleSignIn = (user) => {
    setIsAuthenticated(true);
    setUser(user);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
   <Router>
  <Routes>
    {/* Show MainPage always on / */}
    <Route 
      path="/" 
      element={<MainPage user={user} onLogout={handleLogout} />} 
    />

    {/* SignIn page on /signin */}
    <Route
      path="/signin"
      element={
        !isAuthenticated ? (
          <SignIn onSignIn={handleSignIn} />
        ) : (
          <Navigate to="/dashboard" />
        )
      }
    />

    {/* Auth protected Dashboard */}
    <Route
      path="/dashboard"
      element={
        isAuthenticated ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          <Navigate to="/signin" />
        )
      }
    />

    {/* Auth protected Video Call */}
    <Route
      path="/video-call"
      element={
        isAuthenticated ? (
          <VideoCallingWithARHand user={user} onCallEnd={() => {}} />
        ) : (
          <Navigate to="/signin" />
        )
      }
    />

    {/* Optional: MainPage route with auth */}
    <Route
      path="/mainpage"
      element={
        isAuthenticated ? (
          <MainPage user={user} onLogout={handleLogout} />
        ) : (
          <Navigate to="/signin" />
        )
      }
    />
  </Routes>
</Router>

  );
};

export default App;  
