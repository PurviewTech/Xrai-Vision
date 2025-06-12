import React from 'react';
import { 
  Mic, MicOff, Video, VideoOff, Hand, HandMetal, 
  PinIcon, Maximize2, Crown, Shield, 
  ChevronDown, MessageSquare, X
} from 'lucide-react';

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
  
  // Group participants by role
  const hostParticipants = Object.values(participants).filter(p => p.role === 'host');
  const regularParticipants = Object.values(participants).filter(p => p.role === 'participant');
  const observerParticipants = Object.values(participants).filter(p => p.role === 'observer');
  
  const renderParticipant = (participant, index) => {
    const isLocal = participant.uid === localUser.uid;
    const hasRaisedHand = raisedHands.includes(participant.uid);
    const roleBadge = {
      host: { bg: 'bg-yellow-500', icon: <Crown size={14} className="mr-1" /> },
      participant: { bg: 'bg-blue-500', icon: null },
      observer: { bg: 'bg-gray-500', icon: null }
    }[participant.role];
    
    return (
      <div key={`${participant.uid}-${index}`} className={`p-3 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'} flex items-center justify-between`}>
        <div className="flex items-center">
          {/* User avatar and name */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {(participant.name || String(participant.uid)).charAt(0).toUpperCase()}
            </div>
            
            {hasRaisedHand && (
              <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                <HandMetal size={12} className="text-black" />
              </div>
            )}
          </div>
          
          <div className="ml-3">
            <div className="flex items-center">
              <span className="font-medium text-white">
                {participant.name || `User ${String(participant.uid).substring(0, 6)}`}
              </span>
              {isLocal && <span className="ml-2 text-xs text-gray-400">(You)</span>}
              
              <span className={`ml-2 ${roleBadge.bg} text-white text-xs px-2 py-0.5 rounded-full flex items-center`}>
                {roleBadge.icon}
                {participant.role}
              </span>
            </div>
            
            <div className="flex mt-1">
              {/* Network quality indication */}
              <div className="flex space-x-1">
                {[...Array(participant.networkQuality || 0)].map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                ))}
                {[...Array(5 - (participant.networkQuality || 0))].map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 bg-gray-600 rounded-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Media controls and actions */}
          <button 
            className={`p-1.5 rounded-full ${participant.isMuted ? 'bg-red-500' : 'bg-green-600'}`}
            onClick={() => onToggleMute(participant.uid)}
            disabled={!isHost && !isLocal}
            title={participant.isMuted ? "Unmute" : "Mute"}
          >
            {participant.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          
          <button
            className={`p-1.5 rounded-full ${!participant.hasVideo ? 'bg-red-500' : 'bg-green-600'}`}
            onClick={() => onToggleVideo(participant.uid)}
            disabled={!isHost && !isLocal}
            title={!participant.hasVideo ? "Enable video" : "Disable video"}
          >
            {!participant.hasVideo ? <VideoOff size={14} /> : <Video size={14} />}
          </button>
          
          {isHost && !isLocal && (
            <>
              <button
                className="p-1.5 rounded-full bg-gray-700 hover:bg-gray-600"
                onClick={() => onSendDirectMessage(participant.uid)}
                title="Send direct message"
              >
                <MessageSquare size={14} />
              </button>
              
              <button
                className={`p-1.5 rounded-full ${participant.isSpotlighted ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => onToggleSpotlight(participant.uid)}
                title={participant.isSpotlighted ? "Remove spotlight" : "Spotlight user"}
              >
                <Maximize2 size={14} />
              </button>
              
              <button
                className={`p-1.5 rounded-full ${participant.isPinned ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                onClick={() => onTogglePin(participant.uid)}
                title={participant.isPinned ? "Unpin" : "Pin user"}
              >
                <PinIcon size={14} />
              </button>
              
              {hasRaisedHand && (
                <button
                  className="p-1.5 rounded-full bg-yellow-500"
                  onClick={() => onLowerHand(participant.uid)}
                  title="Lower hand"
                >
                  <Hand size={14} />
                </button>
              )}
              
              <div className="relative group">
                <button
                  className="p-1.5 rounded-full bg-gray-700 hover:bg-gray-600"
                  title="More options"
                >
                  <ChevronDown size={14} />
                </button>
                
                <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg hidden group-hover:block z-10">
                  {participant.role !== 'host' && (
                    <button 
                      onClick={() => onPromoteUser(participant.uid)} 
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-white flex items-center"
                    >
                      <Crown size={14} className="mr-2 text-yellow-500" />
                      Make host
                    </button>
                  )}
                  {participant.role === 'host' && (
                    <button 
                      onClick={() => onDemoteUser(participant.uid)} 
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm text-white flex items-center"
                    >
                      <Shield size={14} className="mr-2 text-blue-500" />
                      Make participant
                    </button>
                  )}
                  <button 
                    onClick={() => onRemoveUser(participant.uid)} 
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 hover:text-red-500 text-sm text-white flex items-center"
                  >
                    <X size={14} className="mr-2 text-red-500" />
                    Remove from call
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-700 overflow-hidden w-80">
      <div className="bg-gray-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Users className="text-blue-400 mr-2" size={20} />
          <h3 className="font-semibold text-white">Participants</h3>
          <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {Object.keys(participants).length}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Hosts section */}
        {hostParticipants.length > 0 && (
          <div>
            <div className="bg-gray-700 px-4 py-2 text-xs font-medium text-gray-300 uppercase">
              Hosts ({hostParticipants.length})
            </div>
            {hostParticipants.map(renderParticipant)}
          </div>
        )}
        
        {/* Participants section */}
        {regularParticipants.length > 0 && (
          <div>
            <div className="bg-gray-700 px-4 py-2 text-xs font-medium text-gray-300 uppercase">
              Participants ({regularParticipants.length})
            </div>
            {regularParticipants.map(renderParticipant)}
          </div>
        )}
        
        {/* Observers section */}
        {observerParticipants.length > 0 && (
          <div>
            <div className="bg-gray-700 px-4 py-2 text-xs font-medium text-gray-300 uppercase">
              Observers ({observerParticipants.length})
            </div>
            {observerParticipants.map(renderParticipant)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantPanel;