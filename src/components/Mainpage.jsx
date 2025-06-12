// "use client"
// import { Link } from 'react-router-dom';
// import { ArrowUpRight } from "lucide-react";
// import SignLogo from '../assets/xrai.png';

//   import { useState } from "react"; 

// export default function Mainpage() {
//   const signinUrl = "/signin";  // Internal route
//   const adminUrl = "https://client-admin-6ac45.web.app/"; // External admin URL
 




//   const [hoverProvider, setHoverProvider] = useState(false);
//   const [hoverAdmin, setHoverAdmin] = useState(false);


//   return (
//     <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-950 overflow-hidden relative">
//       {/* Background wave effect */}
//       <div className="absolute inset-0 z-0 opacity-50">
//         {/* ... your wave backgrounds ... */}
//       </div>

//       <div className="relative z-10">
//         {/* Header */}
//         <header className="flex justify-between items-center p-4 md:p-6">
//           <div className="flex items-center">
//             <img src={SignLogo} alt="XRAI Logo" className="w-35 h-28" />
//             {/* <span className="ml-2 text-blue-600 font-medium">XRAI VISION</span> */}
//           </div>

//           <div className="flex items-center gap-4">

//           </div>
//         </header>

//         {/* Notification Banner */}
//         <div className="bg-blue-950 text-white py-2 px-4 text-center text-sm">
//           <span className="mr-2">🎉</span>
//           Remote Collaboration upgraded: comprehensive progress in key capabilities.
//           {/* <a href="#" className="text-blue-600 hover:underline ml-1">
//             Click for details.
//           </a> */}
//         </div>

//         {/* Main Content */}
//         <main className="max-w-6xl mx-auto px-4 pt-16 pb-24 text-center">
//           <h1 className="text-blue-500 text-6xl md:text-7xl font-bold mb-4">XRAI VISION</h1>
//           <h2 className="text-white text-3xl md:text-4xl font-medium mb-16">Remote Colloboration</h2>

//  <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
//       <Link
//         to={signinUrl}
//         className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow text-left"
//         onMouseEnter={() => setHoverProvider(true)}
//         onMouseLeave={() => setHoverProvider(false)}
//       >
//         <h3 className="text-blue-500 text-2xl font-bold mb-2">Provider Sign In</h3>
//         {/* Short underline that appears on hover */}
//         <div
//           className={`h-[2px] bg-blue-500 w-16 mb-4 transition-all duration-300 ${
//             hoverProvider ? "opacity-100" : "opacity-0"
//           }`}
//         />
//         <p className="text-gray-600">
//           Access to Remote Collaboration platform.
//           <br />
//         </p>
//       </Link>

//       <a
//         href={adminUrl}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow text-left"
//         onMouseEnter={() => setHoverAdmin(true)}
//         onMouseLeave={() => setHoverAdmin(false)}
//       >
//         <h3 className="text-blue-500 text-2xl font-bold mb-2">Admin Login</h3>
//         {/* Short underline that appears on hover */}
//         <div
//           className={`h-[2px] bg-blue-500 w-16 mb-4 transition-all duration-300 ${
//             hoverAdmin ? "opacity-100" : "opacity-0"
//           }`}
//         />
//         <p className="text-gray-600">
//           Chat on the go with Remote Collaboration
//         </p>
//       </a>
//     </div>

//         </main>
//       </div>
//     </div>
//   );
// }   





"use client";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import SignLogo from "../assets/xrai.png";

export default function Mainpage() {
  const signinUrl = "/signin"; // Internal route
  const adminUrl = "https://client-admin-6ac45.web.app/"; // External admin URL

  // Hover states
  const [hoverProvider, setHoverProvider] = useState(false);
  const [hoverAdmin, setHoverAdmin] = useState(false);

  // Refs to measure title widths
  const providerRef = useRef(null);
  const adminRef = useRef(null);

  // State to store measured widths
  const [providerWidth, setProviderWidth] = useState(0);
  const [adminWidth, setAdminWidth] = useState(0);

  // Measure widths after component mounts
  useEffect(() => {
    if (providerRef.current) setProviderWidth(providerRef.current.offsetWidth);
    if (adminRef.current) setAdminWidth(adminRef.current.offsetWidth);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-950 overflow-hidden relative">
      {/* Background wave effect */}
      <div className="absolute inset-0 z-0 opacity-50">
        {/* ... your wave backgrounds ... */}
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center p-4 md:p-6">
          <div className="flex items-center">
            <img src={SignLogo} alt="XRAI Logo" className="w-35 h-28" />
            {/* Uncomment if you want text next to logo */}
            {/* <span className="ml-2 text-blue-600 font-medium">XRAI VISION</span> */}
          </div>

          <div className="flex items-center gap-4">{/* Additional header items */}</div>
        </header>

        {/* Notification Banner */}
        <div className="bg-blue-950 text-white py-2 px-4 text-center text-sm">
          <span className="mr-2">🎉</span>
          Remote Collaboration upgraded: comprehensive progress in key capabilities.
        </div>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 pt-16 pb-24 text-center">
          {/* <h1 className="text-purpule-500 text-6xl md:text-7xl font-bold mb-4">XRAI VISION</h1> */}
          <h1 className="text-purple-500  text-6xl md:text-6xl font-bold mb-4">XRAI VISION</h1>

          <h2 className="text-white text-3xl md:text-3xl font-medium mb-16">Remote Colloboration</h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link
              to={signinUrl}
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow text-left"
              onMouseEnter={() => setHoverProvider(true)}
              onMouseLeave={() => setHoverProvider(false)}
            >
              <h3 ref={providerRef} className="text-purple-500 text-2xl font-bold mb-2">
                User Login
              </h3>
              {/* Underline with dynamic width and fade in/out */}
              <div
                style={{ width: providerWidth }}
                className={`h-[2px] bg-blue-500 mb-4 transition-opacity duration-300 ${
                  hoverProvider ? "opacity-100" : "opacity-0"
                }`}
              />
              <p className="text-gray-600">
                Access to Remote Collaboration platform.
                <br />
              </p>
            </Link>

            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow text-left"
              onMouseEnter={() => setHoverAdmin(true)}
              onMouseLeave={() => setHoverAdmin(false)}
            >
              <h3 ref={adminRef} className="text-purple-500 text-2xl font-bold mb-2">
                Admin Login
              </h3>
              {/* Underline with dynamic width and fade in/out */}
              <div
                style={{ width: adminWidth }}
                className={`h-[2px] bg-blue-500 mb-4 transition-opacity duration-300 ${
                  hoverAdmin ? "opacity-100" : "opacity-0"
                }`}
              />
              <p className="text-gray-600">Manage your team's users, licenses, and subscriptions with ease.</p>
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}

