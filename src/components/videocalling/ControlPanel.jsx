import React, { useCallback, useState } from "react";
import {
  Mic, MicOff, Video, VideoOff, ZoomIn, ZoomOut,
  Share2, StopCircle, Camera, Circle, MessageSquare,
  Phone, Hand, MousePointer
} from "lucide-react";
import { ref, get, update } from "firebase/database";
import AcUnitIcon from '@mui/icons-material/AcUnit';

const ControlPanel = ({
  callId,
  database,
  clientRef,
  localAudioTrackRef,
  localVideoTrackRef,
  remoteVideoContainerRef,
  channelRef,
  recordingRef,
  isMuted, setIsMuted,
  stopVideoState, setStopVideoState,
  isVideoFrozen, setIsVideoFrozen,
  setFreezeOverlayVisible,
  frozenFrame, setFrozenFrame,
  isScreenSharing,
  setIsScreenSharing,
  isRecording,
  setIsRecording,
  toggleChat,
  endCall,
  setARHandActive,
  isARHandActive,
  cursorActive,
  setCursorActive,
  onScreenShare
}) => {
  const toggleMute = () => {
    if (localAudioTrackRef.current) {
      const newMutedState = !isMuted;
      localAudioTrackRef.current.setMuted(newMutedState);
      setIsMuted(newMutedState);
    }
  };

  const toggleVideo = useCallback(async () => {
    const nodeRef = ref(database, `videoCalls/${callId}`);
    const snap = await get(nodeRef);
    const cur = snap.val()?.stopVideo || "stop";
    const next = cur === "stop" ? "start" : "stop";

    await update(nodeRef, { stopVideo: next });
    setStopVideoState(next);

    if (localVideoTrackRef.current) {
      if (next === "stop") {
        localVideoTrackRef.current.setEnabled(false);
      } else {
        localVideoTrackRef.current.setEnabled(true);
        localVideoTrackRef.current.play("local-player");
      }
    }
  }, [callId, database, localVideoTrackRef, setStopVideoState]);

  const toggleARHand = () => {
    setARHandActive((prev) => !prev);
  };

  const captureVideoFrame = useCallback(() => {
    if (!remoteVideoContainerRef.current) return;
    const vid = remoteVideoContainerRef.current.querySelector("video");
    if (!vid) return;

    const canvas = document.createElement("canvas");
    canvas.width = vid.videoWidth || 640;
    canvas.height = vid.videoHeight || 480;
    canvas.getContext("2d").drawImage(vid, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/png");
    setFrozenFrame(dataURL);
    if (channelRef.current) {
      update(channelRef.current, { frozenFrameUrl: dataURL });
    }
  }, [remoteVideoContainerRef, setFrozenFrame, channelRef]);

  const toggleFreeze = useCallback(async () => {
    if (!channelRef.current) return;
    const snap = await get(channelRef.current);
    const cur = snap.val()?.freeze || "off";
    const next = cur === "off" ? "on" : "off";
    await update(channelRef.current, { freeze: next });
    setIsVideoFrozen(next === "on");
    setFreezeOverlayVisible(next === "on");
    if (next === "on" && !frozenFrame) captureVideoFrame();
    if (next === "off") setFrozenFrame(null);
  }, [channelRef, frozenFrame, setIsVideoFrozen, setFreezeOverlayVisible, setFrozenFrame, captureVideoFrame]);

  const zoom = (dir) => {
    update(ref(database, `videoCalls/${callId}`), { zoom: dir });
  };

  const toggleScreenShare = async () => {
    if (typeof onScreenShare === 'function') {
      await onScreenShare();
    }
  };

  const startRecording = useCallback(() => {
    if (!remoteVideoContainerRef.current) return;
    const vid = remoteVideoContainerRef.current.querySelector("video");
    if (!vid || !vid.srcObject) return;
    try {
      const rec = new MediaRecorder(vid.srcObject, { mimeType: "video/webm; codecs=vp9" });
      const chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () =>
          update(ref(database, `videoCalls/${callId}/captures/${Date.now()}`),
            { videoUrl: reader.result, timestamp: new Date().toISOString() });
        reader.readAsDataURL(blob);
      };
      rec.start();
      recordingRef.current = rec;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  }, [remoteVideoContainerRef, database, callId, recordingRef, setIsRecording]);

  const stopRecording = useCallback(() => {
    if (recordingRef.current && recordingRef.current.state !== "inactive") {
      recordingRef.current.stop();
      recordingRef.current = null;
      setIsRecording(false);
    }
  }, [recordingRef, setIsRecording]);

  const captureImage = useCallback(() => {
    if (!remoteVideoContainerRef.current) return;
    const vid = remoteVideoContainerRef.current.querySelector("video");
    if (!vid) return;
    const c = document.createElement("canvas");
    c.width = vid.videoWidth || 640;
    c.height = vid.videoHeight || 480;
    c.getContext("2d").drawImage(vid, 0, 0, c.width, c.height);
    const img = c.toDataURL("image/png");
    update(ref(database, `videoCalls/${callId}/captures/${Date.now()}`),
      { imageUrl: img, timestamp: new Date().toISOString() });
    const a = document.createElement("a");
    a.href = img;
    a.download = `screenshot-${Date.now()}.png`;
    a.click();
  }, [remoteVideoContainerRef, database, callId]);

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-lg rounded-2xl p-3 flex justify-center items-center gap-2 z-20 border border-white/10 shadow-2xl">
      <CompactIconBtn 
        icon={isMuted ? <MicOff /> : <Mic />} 
        label={isMuted ? "Unmute" : "Mute"} 
        onClick={toggleMute}
        isActive={!isMuted}
      />
      <CompactIconBtn 
        icon={stopVideoState === "stop" ? <Video /> : <VideoOff />} 
        label={stopVideoState === "stop" ? "Turn Video On" : "Turn Video Off"} 
        onClick={toggleVideo}
        isActive={stopVideoState !== "stop"}
      />
      <CompactIconBtn 
        icon={<AcUnitIcon />} 
        label={isVideoFrozen ? "Unfreeze Video" : "Freeze Video"} 
        onClick={toggleFreeze}
        isActive={isVideoFrozen}
      />
      <CompactIconBtn 
        icon={<ZoomIn />} 
        label="Zoom In" 
        onClick={() => zoom("zoomin")} 
      />
      <CompactIconBtn 
        icon={<ZoomOut />} 
        label="Zoom Out" 
        onClick={() => zoom("zoomout")} 
      />
      <CompactIconBtn 
        icon={<Share2 />} 
        label={isScreenSharing ? "Stop Screen Share" : "Share Screen"} 
        onClick={toggleScreenShare}
        isActive={isScreenSharing}
      />
      <CompactIconBtn 
        icon={<MessageSquare />} 
        label="Toggle Chat" 
        onClick={toggleChat} 
      />
      <CompactIconBtn 
        icon={<Camera />} 
        label="Capture Photo" 
        onClick={captureImage} 
      />
      <CompactIconBtn 
        icon={isRecording ? <StopCircle /> : <Circle className="text-red-400" />} 
        label={isRecording ? "Stop Recording" : "Start Recording"} 
        onClick={isRecording ? stopRecording : startRecording}
        isActive={isRecording}
        variant={isRecording ? "danger" : "record"}
      />
      <CompactIconBtn 
        icon={<Hand className="rotate-12" />} 
        label={isARHandActive ? "Deactivate AR Hand" : "Activate AR Hand"} 
        onClick={toggleARHand}
        isActive={isARHandActive}
      />
      <CompactIconBtn 
        icon={<MousePointer />} 
        label={cursorActive ? "Disable Pointer" : "Enable Pointer"} 
        onClick={() => setCursorActive((prev) => !prev)}
        isActive={cursorActive}
      />
      <CompactIconBtn 
        icon={<Phone />} 
        label="End Call" 
        onClick={endCall} 
        variant="danger"
      />
    </div>
  );
};

const CompactIconBtn = ({ icon, label, onClick, isActive = false, variant = "default" }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getButtonClasses = () => {
    const baseClasses = "relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95";
    
    switch (variant) {
      case "danger":
        return `${baseClasses} bg-red-600/90 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/30`;
      case "record":
        return `${baseClasses} ${isActive 
          ? "bg-red-600/90 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/30" 
          : "bg-white/10 hover:bg-white/20 text-white shadow-lg hover:shadow-white/20"
        }`;
      default:
        return `${baseClasses} ${isActive 
          ? "bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/30" 
          : "bg-white/10 hover:bg-white/20 text-white shadow-lg hover:shadow-white/20"
        }`;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={getButtonClasses()}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={label}
      >
        {React.cloneElement(icon, { size: 20 })}
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900/95 text-white text-xs rounded-lg whitespace-nowrap shadow-lg border border-white/10 backdrop-blur-sm">
          {label}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95"></div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;