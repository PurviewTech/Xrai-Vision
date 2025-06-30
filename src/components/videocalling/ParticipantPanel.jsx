import React, { useEffect, useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Hand, HandMetal, 
  PinIcon, Maximize2, Crown, Shield, 
  ChevronDown, MessageSquare, X
} from 'lucide-react';
import { get, ref as dbRef } from 'firebase/database';
import { database } from '../../firebaseConfig';

const ParticipantPanel = ({ 
  participants,
  localUser,
  userRole,
  onToggleMute,
  onToggleVideo,
  onToggleSpotlight,
  onTogglePin,
  onPromoteUser,
  onDemoteUser,
  onRemoveUser,
  onSendDirectMessage,
  raisedHands = [],
  onLowerHand,
  onClose
}) => {
  const isHost = userRole === 'host';
  const [userProfiles, setUserProfiles] = useState({});

  useEffect(() => {
    const fetchProfiles = async () => {
      const newProfiles = {};
      await Promise.all(
        Object.keys(participants).map(async (uid) => {
          if (!userProfiles[uid]) {
            try {
              const userRef = dbRef(database, `users/${uid}`);
              const snap = await get(userRef);
              if (snap.exists()) {
                const data = snap.val();
                newProfiles[uid] = data.name || data.displayName || data.email || uid;
              } else {
                newProfiles[uid] = uid;
              }
            } catch {
              newProfiles[uid] = uid;
            }
          }
        })
      );
      setUserProfiles((prev) => ({ ...prev, ...newProfiles }));
    };
    if (participants && Object.keys(participants).length > 0) {
      fetchProfiles();
    }
    // eslint-disable-next-line
  }, [participants]);

  // Group participants by role
  const hostParticipants = Object.values(participants).filter(p => p.role === 'host');
  const regularParticipants = Object.values(participants).filter(p => p.role === 'participant');
  const observerParticipants = Object.values(participants).filter(p => p.role === 'observer');

  return (
    <div className="fixed right-0 top-[60px] bottom-[76px] w-80 bg-gray-800 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-700 border-b border-gray-600">
        <h3 className="text-white font-semibold">Participants ({Object.keys(participants).length + 1})</h3>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Host Section */}
        {hostParticipants.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Host</div>
            {hostParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isLocalUser={participant.id === localUser?.id}
                isHost={true}
                onToggleMute={onToggleMute}
                onToggleVideo={onToggleVideo}
                onSendDirectMessage={onSendDirectMessage}
              />
            ))}
          </div>
        )}

        {/* Regular Participants Section */}
        {regularParticipants.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Participants</div>
            {regularParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isLocalUser={participant.id === localUser?.id}
                isHost={isHost}
                onToggleMute={onToggleMute}
                onToggleVideo={onToggleVideo}
                onSendDirectMessage={onSendDirectMessage}
                onPromoteUser={onPromoteUser}
                onDemoteUser={onDemoteUser}
                onRemoveUser={onRemoveUser}
              />
            ))}
          </div>
        )}

        {/* Observers Section */}
        {observerParticipants.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Observers</div>
            {observerParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isLocalUser={participant.id === localUser?.id}
                isHost={isHost}
                onToggleMute={onToggleMute}
                onToggleVideo={onToggleVideo}
                onSendDirectMessage={onSendDirectMessage}
                onPromoteUser={onPromoteUser}
                onDemoteUser={onDemoteUser}
                onRemoveUser={onRemoveUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ParticipantItem = ({
  participant,
  isLocalUser,
  isHost,
  onToggleMute,
  onToggleVideo,
  onSendDirectMessage,
  onPromoteUser,
  onDemoteUser,
  onRemoveUser
}) => {
  // Use only licenseId or id, just like the dashboard
  const displayName = participant?.licenseId || participant?.id || 'Unknown';
  const firstChar = displayName.charAt(0).toUpperCase();
  
  return (
    <div className="flex items-center p-2 bg-gray-700 rounded mx-1 hover:bg-gray-600 transition-colors">
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
        {firstChar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm sm:text-base truncate">
          {displayName}
          {isLocalUser && ' (You)'}
        </div>
        <div className="text-xs sm:text-sm text-gray-400 flex items-center">
          <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
          <span>Online</span>
        </div>
      </div>
      <div className="flex space-x-1 sm:space-x-2 ml-1">
        {/* Audio/Video Status */}
        <div className="flex items-center space-x-1">
          {participant?.isMuted ? (
            <MicOff size={16} className="text-red-500" />
          ) : (
            <Mic size={16} className="text-green-500" />
          )}
          {participant?.hasVideo ? (
            <Video size={16} className="text-green-500" />
          ) : (
            <VideoOff size={16} className="text-red-500" />
          )}
        </div>

        {/* Message Button */}
        <button
          onClick={() => onSendDirectMessage(participant?.id)}
          className="text-white p-1"
          title="Send message"
        >
          <MessageSquare size={16} />
        </button>

        {/* Host Controls */}
        {isHost && !isLocalUser && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onPromoteUser(participant?.id)}
              className="text-white p-1"
              title="Promote to host"
            >
              <Crown size={16} />
            </button>
            <button
              onClick={() => onRemoveUser(participant?.id)}
              className="text-white p-1 hover:text-red-500"
              title="Remove participant"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantPanel;