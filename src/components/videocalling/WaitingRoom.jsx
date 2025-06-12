import React from 'react';
import { Clock, UserCheck, UserX, Users } from 'lucide-react';

const WaitingRoom = ({ 
  waitingUsers, 
  admitUser, 
  denyUser, 
  admitAll, 
  denyAll 
}) => {
  if (!waitingUsers || waitingUsers.length === 0) {
    return (
      <div className="p-4 text-center bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <Users className="mx-auto text-gray-400 mb-2" size={24} />
        <p className="text-gray-400">No users waiting to join</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
      <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Users className="text-blue-400 mr-2" size={20} />
          <h3 className="font-semibold text-white">Waiting Room</h3>
          <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{waitingUsers.length}</span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={admitAll}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
          >
            <UserCheck size={16} className="mr-1" />
            Admit All
          </button>
          <button 
            onClick={denyAll}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
          >
            <UserX size={16} className="mr-1" />
            Deny All
          </button>
        </div>
      </div>
      
      <div className="max-h-60 overflow-y-auto">
        {waitingUsers.map(user => (
          <div key={user.id} className="border-b border-gray-700 px-4 py-3 flex justify-between items-center">
            <div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
                  {(user.name || user.id).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{user.name || `User ${user.id.substring(0, 6)}`}</p>
                  <div className="flex items-center text-xs text-gray-400">
                    <Clock size={12} className="mr-1" />
                    <span>Waiting for {Math.floor((Date.now() - user.joinTime) / 60000)} min</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => admitUser(user.id)}
                className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full"
                aria-label="Admit user"
              >
                <UserCheck size={16} />
              </button>
              <button 
                onClick={() => denyUser(user.id)}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                aria-label="Deny user"
              >
                <UserX size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WaitingRoom;