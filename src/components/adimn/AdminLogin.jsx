// import React, { useState } from 'react';
// import { auth } from '../firebase';
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { useNavigate } from 'react-router-dom';

// const LoginPage = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     try {
//       await signInWithEmailAndPassword(auth, email, password);
//       navigate('/dashboard');
//     } catch (err) {
//       setError('Invalid email or password');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#231F20] text-white flex items-center justify-center px-6 py-12">
//       <div className="bg-[#2C2A2B] p-8 rounded-2xl shadow-xl max-w-lg w-full">
//         <h2 className="text-3xl font-bold text-center text-[#2CB2FF] mb-4">Client Portal Login</h2>
//         {error && <p className="text-red-500 text-center mb-4">{error}</p>}
//         <form onSubmit={handleLogin}>
//           <div className="space-y-4">
//             <input
//               type="email"
//               placeholder="Email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="w-full p-3 rounded-lg bg-[#404AD9] text-white"
//             />
//             <input
//               type="password"
//               placeholder="Password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full p-3 rounded-lg bg-[#404AD9] text-white"
//             />
//           </div>

//           <button
//             type="submit"
//             className="w-full py-3 font-semibold rounded-lg text-white bg-gradient-to-r from-[#404AD9] via-[#9B51E8] to-[#FF4FFC] hover:opacity-90 mt-4"
//           >
//             Login
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;
