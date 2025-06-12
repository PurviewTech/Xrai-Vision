// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { auth } from '../firebase';
// import { signOut } from 'firebase/auth';
// import dayjs from 'dayjs';
// import SubscriptionModal from '../components/SubscriptionModal';

// const mockLicenses = [
//   {
//     id: '1',
//     licenseId: 'LIC-1001',
//     name: 'Alice Johnson',
//     email: 'alice@example.com',
//     password: 'alice123',
//     phone: '1234567890',
//     device: 'Laptop',
//     validity: dayjs().add(5, 'day').format('YYYY-MM-DD'),
//   },
//   {
//     id: '2',
//     licenseId: 'LIC-1002',
//     name: 'Bob Smith',
//     email: 'bob@example.com',
//     password: 'bobpass',
//     phone: '9876543210',
//     device: 'Tablet',
//     validity: dayjs().add(2, 'day').format('YYYY-MM-DD'),
//   },
//   {
//     id: '3',
//     licenseId: 'LIC-1003',
//     name: 'Carol White',
//     email: 'carol@example.com',
//     password: 'carol321',
//     phone: '5647382910',
//     device: 'Phone',
//     validity: dayjs().add(7, 'day').format('YYYY-MM-DD'),
//   },
//   {
//     id: '4',
//     licenseId: 'LIC-1004',
//     name: 'David Lee',
//     email: 'david@example.com',
//     password: 'david456',
//     phone: '1112223333',
//     device: 'Desktop',
//     validity: dayjs().add(10, 'day').format('YYYY-MM-DD'),
//   },
//   {
//     id: '5',
//     licenseId: 'LIC-1005',
//     name: 'Eva Green',
//     email: 'eva@example.com',
//     password: 'eva999',
//     phone: '9998887777',
//     device: 'Laptop',
//     validity: dayjs().add(3, 'day').format('YYYY-MM-DD'),
//   },
// ];

// const Dashboard = () => {
//   const [user] = useState({ email: 'client@example.com' });
//   const [licenses, setLicenses] = useState([]);
//   const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
//   const [licenseIdForModal, setLicenseIdForModal] = useState(null);
//   const [editingId, setEditingId] = useState(null);
//   const [formData, setFormData] = useState({});
//   const [showCreateForm, setShowCreateForm] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     setLicenses(mockLicenses);
//     const expiringLicense = mockLicenses.find(license => calculateDaysLeft(license.validity) <= 2);
//     if (expiringLicense) {
//       setLicenseIdForModal(expiringLicense.id);
//       setShowSubscriptionModal(true);
//     }
//   }, []);

//   const calculateDaysLeft = (expiryDate) => {
//     const now = dayjs();
//     const expiry = dayjs(expiryDate);
//     return expiry.diff(now, 'day');
//   };

//   const handleEditLicense = (e) => {
//     e.preventDefault();
//     setLicenses(prev => prev.map(lic => lic.id === editingId ? { ...lic, ...formData } : lic));
//     setEditingId(null);
//     setFormData({});
//   };

//   const handleExtend = () => {
//     navigate('/payment');
//   };

//   const handleCreateLicense = (e) => {
//     e.preventDefault();
//     const newLicense = {
//       id: (licenses.length + 1).toString(),
//       licenseId: formData.licenseId,
//       name: formData.name,
//       email: formData.email,
//       password: formData.password,
//       phone: formData.phone,
//       device: formData.device,
//       validity: formData.validity,
//     };
//     setLicenses([...licenses, newLicense]);
//     setShowCreateForm(false);
//     setFormData({});
//   };

//   const handleDeleteLicense = (id) => {
//     setLicenses(prev => prev.filter(lic => lic.id !== id));
//   };

//   return (
//     <div className="flex min-h-screen bg-gradient-to-tr from-[#231F20] via-[#404AD9] to-[#2CB2FF] text-white">
//       <aside className="w-64 bg-[#231F20] p-6">
//         <h2 className="text-2xl font-bold mb-10 text-white">Client Portal</h2>
//         <nav className="space-y-4">
          
//           <button onClick={() => navigate('/dashboard')} className="block text-left w-full text-white hover:text-[#2CB2FF]">Dashboard</button>
//           <button onClick={() => navigate('/profile')} className="block text-left w-full text-white hover:text-[#2CB2FF]">Profile</button>
//           <button onClick={() => navigate('/payment')} className="block text-left w-full text-white hover:text-[#2CB2FF]">Payment</button>
//           <button onClick={() => navigate('/contact')} className="block text-left w-full text-white hover:text-[#2CB2FF]">Contact Us</button>
          
//         </nav>
//       </aside>

//       <main className="flex-1 px-10 py-8">
//         <div className="flex justify-between items-center mb-10">
//           <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#9B51E8] via-[#FF4FFC] to-[#2CB2FF]">
//             Welcome, {user?.email}
//           </h1>
//           <button
//             onClick={() => {
//               setShowCreateForm(!showCreateForm);
//               setEditingId(null);
//               setFormData({});
//             }}
//             className="bg-gradient-to-r from-[#9B51E8] via-[#FF4FFC] to-[#2CB2FF] text-white px-6 py-2 rounded-2xl shadow-lg hover:opacity-90 transition"
//           >
//             {showCreateForm ? 'Cancel' : 'Assign License'}
//           </button>
//         </div>

//         {(showCreateForm || editingId) && (
//           <div className="bg-white text-black p-6 rounded-2xl shadow-xl mb-10">
//             <h2 className="text-2xl font-semibold mb-4">{editingId ? 'Edit License' : 'Assign License'}</h2>
//             <form onSubmit={editingId ? handleEditLicense : handleCreateLicense} className="grid grid-cols-2 gap-4">
//               {['licenseId','name','email','password','phone','device'].map(field => (
//                 <input
//                   key={field}
//                   type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
//                   className="border p-2 rounded mb-2 w-full"
//                   placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
//                   value={formData[field] || ''}
//                   onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
//                 />
//               ))}
//               <input
//                 type="date"
//                 className="border p-2 rounded mb-4 w-full"
//                 value={formData.validity || ''}
//                 onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
//               />
//               <button type="submit" className="bg-gradient-to-r from-[#404AD9] via-[#9B51E8] to-[#FF4FFC] hover:opacity-90 text-white px-4 py-2 rounded shadow">
//                 {editingId ? 'Update License' : 'Create License'}
//               </button>
//             </form>
//           </div>
//         )}

//         <div className="overflow-x-auto bg-white text-black p-6 rounded-2xl shadow-xl">
//           <h2 className="text-2xl font-semibold text-[#231F20] mb-6">Your Licenses</h2>
//           <table className="w-full table-auto text-left">
//             <thead>
//               <tr className="bg-gray-100 text-[#231F20]">
//                 {['License ID','Assigned To','Email','Password','Phone','Device Type','Validity','Actions'].map(col => (
//                   <th key={col} className="py-2 px-4 border-b">{col}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {licenses.map((license) => {
//                 const daysLeft = calculateDaysLeft(license.validity);
//                 return (
//                   <tr key={license.id} className="hover:bg-gray-50">
//                     <td className="py-2 px-4 border-b">{license.licenseId}</td>
//                     <td className="py-2 px-4 border-b">{license.name}</td>
//                     <td className="py-2 px-4 border-b">{license.email}</td>
//                     <td className="py-2 px-4 border-b">{license.password}</td>
//                     <td className="py-2 px-4 border-b">{license.phone}</td>
//                     <td className="py-2 px-4 border-b">{license.device}</td>
//                     <td className="py-2 px-4 border-b">{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</td>
//                     <td className="py-2 px-4 border-b space-x-2 flex items-center">
//                       <button
//                         onClick={() => {
//                           setEditingId(license.id);
//                           setFormData(license);
//                           setShowCreateForm(false);
//                         }}
//                         className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded shadow"
//                       >Edit</button>
//                       <button
//                         onClick={() => handleDeleteLicense(license.id)}
//                         className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow"
//                       >Delete</button>
//                       {daysLeft <= 2 && license.id === licenseIdForModal && (
//                         <button
//                           onClick={handleExtend}
//                           className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow"
//                         >Extend</button>
//                       )}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>

//         <SubscriptionModal
//           show={showSubscriptionModal}
//           handleClose={() => setShowSubscriptionModal(false)}
//           handleExtend={handleExtend}
//         />
//       </main>
//     </div>
//   );
// };

// export default AdminDashboard;
