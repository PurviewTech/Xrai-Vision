import React, { useCallback, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pause,
  Play,
  ZoomIn,
  ZoomOut,
  Share2,
  StopCircle,
  Camera,
  Circle,
  MessageSquare,
  Phone,
  Hand,
  Mouse,
  Snowflake,
} from "lucide-react";
import { ref, get, update, onValue } from "firebase/database";
import AgoraRTC from "agora-rtc-sdk-ng";
import AcUnitIcon from "@mui/icons-material/AcUnit";

const ControlPanel = ({
  /* primitives */
  callId,
  database,
  /* refs */
  clientRef,
  localAudioTrackRef,
  remoteVideoContainerRef,
  channelRef,
  recordingRef,
  screenShareRef,
  /* state + setters */
  isMuted,
  setIsMuted,
  stopVideoState,
  setStopVideoState,
  isVideoFrozen,
  setIsVideoFrozen,
  setFreezeOverlayVisible,
  frozenFrame,
  setFrozenFrame,
  isScreenSharing,
  setIsScreenSharing,
  isRecording,
  setIsRecording,
  /* high‑level helpers */
  toggleChat,
  endCall,
  setARHandActive,
  isARHandActive,
  /* cursor-related */
  cursorActive,
  setCursorActive,
}) => {
  /* ---------- helpers ---------- */

  const toggleMute = useCallback(() => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [localAudioTrackRef, isMuted, setIsMuted]);

  const toggleVideo = useCallback(() => {
    if (stopVideoState === "stop") {
      setStopVideoState("start");
    } else {
      setStopVideoState("stop");
    }
  }, [stopVideoState, setStopVideoState]);

  const toggleFreeze = useCallback(async () => {
    try {
      const newFreezeState = !isVideoFrozen;

      // Update local state first for immediate feedback
      setIsVideoFrozen(newFreezeState);
      setFreezeOverlayVisible(newFreezeState);

      if (newFreezeState) {
        // Freeze
        const canvas = document.createElement("canvas");
        const video = remoteVideoContainerRef.current?.querySelector("video");
        if (video) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0);
          const frozenImage = canvas.toDataURL();
          setFrozenFrame(frozenImage);

          // Update Firebase
          if (callId) {
            const callRef = ref(database, `videoCalls/${callId}`);
            await update(callRef, {
              freeze: "on",
              frozenFrame: frozenImage,
              lastUpdated: new Date().toISOString(),
            });
            console.log("Freeze state updated to ON");
          }
        }
      } else {
        // Unfreeze
        setFrozenFrame(null);

        // Update Firebase
        if (callId) {
          const callRef = ref(database, `videoCalls/${callId}`);
          await update(callRef, {
            freeze: "off",
            lastUpdated: new Date().toISOString(),
          });
          console.log("Freeze state updated to OFF");
        }
      }
    } catch (error) {
      console.error("Error toggling freeze:", error);
      // Revert local state if there's an error
      setIsVideoFrozen(!isVideoFrozen);
      setFreezeOverlayVisible(!isVideoFrozen);
    }
  }, [
    callId,
    database,
    isVideoFrozen,
    setIsVideoFrozen,
    setFreezeOverlayVisible,
    setFrozenFrame,
    remoteVideoContainerRef,
  ]);

  const zoom = useCallback(
    async (type) => {
      if (!callId) return;

      try {
        const callRef = ref(database, `videoCalls/${callId}`);
        const snapshot = await get(callRef);
        const currentScale = snapshot.val()?.zoomLevel || 1;

        let newScale =
          type === "zoomin" ? currentScale + 0.1 : currentScale - 0.1;
        newScale = Math.max(0.5, Math.min(newScale, 2)); // Clamp between 0.5 and 2

        await update(callRef, {
          zoomLevel: newScale,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error updating zoom level:", error);
      }
    },
    [callId, database]
  );

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        await screenShareRef.current?.startScreenShare();
      } else {
        // Stop screen sharing
        await screenShareRef.current?.stopScreenShare();
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        // Stop recording
        if (recordingRef.current) {
          await recordingRef.current.stop();
          recordingRef.current = null;
        }
        setIsRecording(false);
      } else {
        // Start recording
        const stream = remoteVideoContainerRef.current.captureStream();
        recordingRef.current = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
        });

        const chunks = [];
        recordingRef.current.ondataavailable = (e) => chunks.push(e.data);
        recordingRef.current.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `video-call-recording-${new Date().toISOString()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        recordingRef.current.start();
        setIsRecording(true);
      }
    } catch (error) {
      console.error("Error toggling recording:", error);
    }
  };

  const captureImage = useCallback(() => {
    if (!remoteVideoContainerRef.current) return;
    const video = remoteVideoContainerRef.current.querySelector("video");
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageUrl = canvas.toDataURL("image/jpeg");
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `screenshot-${new Date().toISOString()}.jpg`;
    a.click();
  }, [remoteVideoContainerRef]);

  const toggleARHand = useCallback(async () => {
    const newState = !isARHandActive;
    try {
      // Update local state first
      setARHandActive(newState);

      // Update Firebase
      if (callId) {
        const callRef = ref(database, `videoCalls/${callId}`);
        await update(callRef, {
          arHandActive: newState,
          lastUpdated: new Date().toISOString(),
        });

        // Log for debugging
        console.log("AR Hand state updated:", newState);
      }
    } catch (error) {
      console.error("Error toggling AR Hand:", error);
      // Revert local state if Firebase update fails
      setARHandActive(!newState);
    }
  }, [callId, database, isARHandActive, setARHandActive]);

  // Add useEffect to listen for AR Hand state changes
  useEffect(() => {
    if (!callId) return;

    const callRef = ref(database, `videoCalls/${callId}`);
    const unsubscribe = onValue(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.arHandActive !== undefined) {
          setARHandActive(data.arHandActive);
          console.log("AR Hand state synced:", data.arHandActive);
        }
      }
    });

    return () => unsubscribe();
  }, [callId, database, setARHandActive]);

  // Update the freeze state listener
  useEffect(() => {
    if (!callId) return;

    const callRef = ref(database, `videoCalls/${callId}`);
    const unsubscribe = onValue(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.freeze !== undefined) {
          const newFreezeState = data.freeze === "on";
          console.log("Freeze state changed:", newFreezeState);
          setIsVideoFrozen(newFreezeState);
          setFreezeOverlayVisible(newFreezeState);
          if (data.frozenFrame && newFreezeState) {
            setFrozenFrame(data.frozenFrame);
          } else if (!newFreezeState) {
            setFrozenFrame(null);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [
    callId,
    database,
    setIsVideoFrozen,
    setFreezeOverlayVisible,
    setFrozenFrame,
  ]);

  // Add useEffect to listen for zoom level changes
  useEffect(() => {
    if (!callId || !remoteVideoContainerRef.current) return;

    const callRef = ref(database, `videoCalls/${callId}`);
    const unsubscribe = onValue(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.zoomLevel !== undefined) {
          const video = remoteVideoContainerRef.current?.querySelector("video");
          if (video) {
            video.style.transform = `scale(${data.zoomLevel})`;
          }
        }
      }
    });

    return () => unsubscribe();
  }, [callId, database, remoteVideoContainerRef]);

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center items-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="flex space-x-4">
        {/* Mute/Unmute Button */}
        <IconBtn
          icon={
            <div className="relative">
              {isMuted ? <MicOff className="text-red-400" /> : <Mic />}
              {isMuted && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          }
          label={isMuted ? "Unmute" : "Mute"}
          onClick={toggleMute}
          className={`
            ${isMuted ? "bg-red-500 hover:bg-red-600" : "hover:bg-gray-700"}
            transition-all duration-300
            transform hover:scale-105
            active:scale-95
            shadow-lg
            ${isMuted ? "shadow-red-500/50" : "shadow-gray-500/30"}
          `}
        />

        {/* Video Toggle Button */}
        <IconBtn
          icon={
            <div className="relative">
              {stopVideoState === "stop" ? (
                <Video className="text-green-400" />
              ) : (
                <VideoOff className="text-red-400" />
              )}
              {stopVideoState !== "stop" && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          }
          label={stopVideoState === "stop" ? "Video On" : "Video Off"}
          onClick={toggleVideo}
          className={`
            ${
              stopVideoState !== "stop"
                ? "bg-red-500 hover:bg-red-600"
                : "hover:bg-gray-700"
            }
            transition-all duration-300
            transform hover:scale-105
            active:scale-95
            shadow-lg
            ${
              stopVideoState !== "stop"
                ? "shadow-red-500/50"
                : "shadow-gray-500/30"
            }
          `}
        />

        {/* Freeze Button */}
        <IconBtn
          icon={
            <div className="relative">
              <Snowflake
                className={`transform transition-all duration-300 ${
                  isVideoFrozen
                    ? "rotate-180 scale-110 text-blue-400 animate-pulse"
                    : "rotate-0 scale-100 text-gray-400"
                }`}
              />
              {isVideoFrozen && (
                <>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                </>
              )}
            </div>
          }
          label={isVideoFrozen ? "Unfreeze" : "Freeze"}
          onClick={toggleFreeze}
          className={`
            relative overflow-hidden
            ${
              isVideoFrozen
                ? "bg-blue-500 hover:bg-blue-600"
                : "hover:bg-gray-700"
            }
            transition-all duration-300
            transform hover:scale-105
            active:scale-95
            shadow-lg
            ${isVideoFrozen ? "shadow-blue-500/50" : "shadow-gray-500/30"}
            ${isVideoFrozen ? "ring-2 ring-blue-400 ring-opacity-50" : ""}
          `}
        />

        {/* Zoom Buttons */}
        <div className="flex space-x-2">
          <IconBtn
            icon={<ZoomIn className="text-gray-400" />}
            label="Zoom In"
            onClick={() => zoom("zoomin")}
            className="hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
          />
          <IconBtn
            icon={<ZoomOut className="text-gray-400" />}
            label="Zoom Out"
            onClick={() => zoom("zoomout")}
            className="hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
          />
        </div>

        {/* Screen Share Button */}
        <IconBtn
          icon={
            <div className="relative">
              {isScreenSharing ? (
                <StopCircle className="text-blue-400" />
              ) : (
                <Share2 />
              )}
              {isScreenSharing && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          }
          label={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          onClick={handleScreenShare}
          className={`
            ${
              isScreenSharing
                ? "bg-blue-500 hover:bg-blue-600"
                : "hover:bg-gray-700"
            }
            transition-all duration-300
            transform hover:scale-105
            active:scale-95
            shadow-lg
            ${isScreenSharing ? "shadow-blue-500/50" : "shadow-gray-500/30"}
          `}
        />

        {/* Chat Button */}
        <IconBtn
          icon={<MessageSquare />}
          label="Chat"
          onClick={toggleChat}
          className="hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
        />

        {/* Photo Button */}
        <IconBtn
          icon={<Camera />}
          label="Photo"
          onClick={captureImage}
          className="hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
        />

        {/* Recording Button */}
        <IconBtn
          icon={
            <div className="relative">
              {isRecording ? (
                <StopCircle className="text-red-400" />
              ) : (
                <Circle className="text-red-400" />
              )}
              {isRecording && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          }
          label={isRecording ? "Stop Recording" : "Start Recording"}
          onClick={toggleRecording}
          className={`
            ${isRecording ? "bg-red-500 hover:bg-red-600" : "hover:bg-gray-700"}
            transition-all duration-300
            transform hover:scale-105
            active:scale-95
            shadow-lg
            ${isRecording ? "shadow-red-500/50" : "shadow-gray-500/30"}
          `}
        />

        {/* Cursor Button */}
        <IconBtn
          icon={
            <div className="relative">
              <Mouse className={`${cursorActive ? "text-blue-400" : ""}`} />
              {cursorActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          }
          label={cursorActive ? "Disable Cursor" : "Enable Cursor"}
          onClick={() => setCursorActive(!cursorActive)}
          className={`
            ${
              cursorActive
                ? "bg-blue-500 hover:bg-blue-600"
                : "hover:bg-gray-700"
            }
            transition-all duration-300
            transform hover:scale-105
            active:scale-95
            shadow-lg
            ${cursorActive ? "shadow-blue-500/50" : "shadow-gray-500/30"}
          `}
        />

        {/* AR Hand Button */}
        <IconBtn
          icon={
            <div className="relative">
              <Hand
                className={`transform transition-all duration-300 ${
                  isARHandActive
                    ? "rotate-12 scale-110 text-blue-400"
                    : "rotate-0 scale-100"
                }`}
              />
              {isARHandActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
          }
          label={isARHandActive ? "Deactivate AR Hand" : "Activate AR Hand"}
          onClick={toggleARHand}
          className={`
            ${
              isARHandActive
                ? "bg-blue-500 hover:bg-blue-600"
                : "hover:bg-gray-700"
            }
            transition-all duration-300
            transform hover:scale-105
            active:scale-95
            shadow-lg
            ${isARHandActive ? "shadow-blue-500/50" : "shadow-gray-500/30"}
          `}
        />

        {/* End Call Button */}
        <IconBtn
          icon={<Phone className="text-red-400" />}
          label="End Call"
          onClick={endCall}
          className="bg-red-500 hover:bg-red-600 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/50"
        />
      </div>
    </div>
  );
};

/* Professional icon button */
const IconBtn = ({ icon, label, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`
      p-2 rounded-full 
      hover:bg-gray-700 
      transition-all duration-200
      ${className}
    `}
    title={label}
  >
    {icon}
  </button>
);

export default ControlPanel;
