import React, { useEffect, useRef, useState } from "react";
import {
  ref,
  push,
  set,
  get,
  onValue,
  update,
  remove,
} from "firebase/database";
import { database } from "../../firebaseConfig";
import { auth } from "../../firebaseConfig";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useNavigate, useSearchParams } from "react-router-dom";
import ScreenShare from "./ScreenShare";

import {
  Mic,
  MicOff,
  Video,
  Pause,
  Play,
  ZoomIn,
  ZoomOut,
  Share2,
  StopCircle,
  MessageSquare,
  Edit,
  Camera,
  Circle,
  Phone,
  Clock,
  Copy,
  CheckCircle,
  AlignCenter,
  X,
  UserX,
  Check,
  RefreshCw,
  Loader2,
  UserPlus,
  Shield,
  Users,
  Grid,
  Sidebar,
  Layout,
  Hand,
  PinIcon,
  Maximize2,
} from "lucide-react";
import ControlPanel from "./ControlPanel";
import ChatPanel from "./ChatPanel";
import AnnotationComponent from "./AnnotationComponent";
import WaitingRoom from "./WaitingRoom";
import ParticipantPanel from "./ParticipantPanel";
import html2canvas from "html2canvas";
import VideoCallTitleDialog from "./VideoCallTitleDialog";
import Pointer from "./Pointer";

// Global Freeze Manager
const FreezeManager = {
  isActive: false,
  isFrozen: false,
  capturedFrame: null,
  freezeInProgress: false,
  fallbackImage: null,

  createFallbackImage: () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createLinearGradient(0, 0, 640, 480);
      gradient.addColorStop(0, "#1a365d");
      gradient.addColorStop(1, "#2a4365");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 480);

      ctx.font = "24px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("Video Feed Frozen", 320, 220);
      ctx.font = "16px Arial";
      ctx.fillText(new Date().toLocaleTimeString(), 320, 250);

      return canvas.toDataURL("image/jpeg", 0.9);
    } catch (error) {
      console.error("Error creating fallback image:", error);
      return null;
    }
  },

  initialize: () => {
    FreezeManager.fallbackImage = FreezeManager.createFallbackImage();
    window.FreezeManager = FreezeManager;
  },
};

FreezeManager.initialize();

const VideoCallingWithARHand = ({ onCallEnd }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoFrozen, setIsVideoFrozen] = useState(false);
  const [isRemoteVideoFrozen, setIsRemoteVideoFrozen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState(null);
  const [localVideoStream, setLocalVideoStream] = useState(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState(null);
  const [remoteVideos, setRemoteVideos] = useState({});
  const [stopVideoState, setStopVideoState] = useState(null);
  const [freezeOverlayVisible, setFreezeOverlayVisible] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callPurpose, setCallPurpose] = useState("Remote Consultation");
  const [copied, setCopied] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [activeRemoteUid, setActiveRemoteUid] = useState(null);
  const [annotations, setAnnotations] = useState({});
  const [isJoined, setIsJoined] = useState(false);
  const [dataStreamChannel, setDataStreamChannel] = useState(null);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showHeaderInfo, setShowHeaderInfo] = useState(true);
  const [wasInCall, setWasInCall] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsersToInvite, setSelectedUsersToInvite] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [toggleAnnotationFn, setToggleAnnotationFn] = useState(null);
  
  const [isARHandActive, setIsARHandActive] = useState(false);
  const [secondCameraTrack, setSecondCameraTrack] = useState(null);
  const secondCameraVideoRef = useRef(null);
  const [cursorActive, setCursorActive] = useState(false);
  const screenShareRef = useRef(null);
  

  // Multi-user enhancement 1: User Roles and Permissions
  const [userRole, setUserRole] = useState("participant"); // 'host', 'participant', 'observer'
  const [participants, setParticipants] = useState({}); // Track all participants with their roles
  const [permissions, setPermissions] = useState({
    canShareScreen: true,
    canRecord: false,
    canAnnotate: true,
    canSendMessages: true,
    canInviteOthers: false,
  });

  // Multi-user enhancement 2: Waiting Room
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [showWaitingRoomDialog, setShowWaitingRoomDialog] = useState(false);

  // Multi-user enhancement 3: Participant Management
  const [showParticipantPanel, setShowParticipantPanel] = useState(false);
  const [raisedHands, setRaisedHands] = useState([]);
  const [spotlightUser, setSpotlightUser] = useState(null);

  // Multi-user enhancement 4: Dynamic Layout
  const [viewMode, setViewMode] = useState("grid"); // 'grid', 'speaker', 'sidebar'
  const [pinnedUsers, setPinnedUsers] = useState([]);

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);
  const frozenFrameRef = useRef(frozenFrame);
  const canvasRef = useRef(null);
  const recordingRef = useRef(null);
  const channelRef = useRef(null);
  const timerRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const uidRef = useRef(null);
  const agoraEngine = useRef(null);
  const videoContainerRef = useRef(null);
  const combinedCanvasRef = useRef(null);

  const [searchParams] = useSearchParams();
  const callId = searchParams.get("callId");
  const uid = searchParams.get("uid");
  const title = searchParams.get("title");
  const navigate = useNavigate();

  //const APP_ID = "28c6ca98a1974a0ebb3842b35d4c9ec9";
  // const APP_ID = "15ae49b078f44fed91592a4b7114d81e";
  const APP_ID = "de690d378ebd4634a39ed1a2c3d6e663";

  const TOKEN = null;

  useEffect(() => {
    // Set the initial state for AR Hand based on Firebase data
    if (callId) {
      const callRef = ref(database, `videoCalls/${callId}`);
      onValue(callRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setIsARHandActive(data.arHandActive || false); // Set initial value from Firebase
        }
      });
    }
  }, [callId]);

  // Initialize cameras and publish video track based on AR hand activity
  useEffect(() => {
    let drawInterval;
    let customTrack;

    const initializeCameras = async () => {
      try {
        const devices = await AgoraRTC.getDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );

        const ipevoCamera = videoDevices.find((device) =>
          device.label.toLowerCase().includes("ipevo")
        );

        if (!ipevoCamera) {
          setError(
            "⚠️ Please connect the IPEVO camera to proceed with AR Hand."
          );
          return;
        }

        if (isARHandActive) {
          const secondTrack = await AgoraRTC.createCameraVideoTrack({
            cameraId: ipevoCamera.deviceId,
          });
          setSecondCameraTrack(secondTrack);
          secondTrack.play(secondCameraVideoRef.current);

          const canvas = document.getElementById("combinedCanvas");
          const ctx = canvas.getContext("2d");

          const drawInterval = setInterval(() => {
            const remoteVideo = document.querySelector('[id^="player-"] video');
            if (remoteVideo && secondCameraVideoRef.current) {
              canvas.width = remoteVideo.videoWidth || 640;
              canvas.height = remoteVideo.videoHeight || 480;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
              ctx.globalAlpha = 0.5;
              ctx.drawImage(
                secondCameraVideoRef.current,
                0,
                0,
                canvas.width,
                canvas.height
              );
              ctx.globalAlpha = 1.0;
            }
          }, 1000 / 30);

          const stream = canvas.captureStream(30);
          const videoTrack = stream.getVideoTracks()[0];
          const customTrack = AgoraRTC.createCustomVideoTrack({
            mediaStreamTrack: videoTrack,
          });
          localVideoTrackRef.current = customTrack;
          await clientRef.current.publish([customTrack]);
        } else {
          // Deactivate AR Hand: Stop IPEVO camera feed and remove the combined video feed
          if (secondCameraTrack) {
            secondCameraTrack.stop();
            secondCameraTrack.close();
            setSecondCameraTrack(null);
          }

          // Ensure that the combined feed is not being published when AR Hand is off
          if (localVideoTrackRef.current) {
            await clientRef.current.unpublish([localVideoTrackRef.current]);
            localVideoTrackRef.current.close();
            setLocalVideoTrackRef(null);
          }
        }
      } catch (error) {
        console.error("Error initializing AR Hand camera:", error);
      }
    };

    initializeCameras();

    return () => {
      // Cleanup
      if (drawInterval) clearInterval(drawInterval);

      if (secondCameraTrack) {
        secondCameraTrack.stop();
        secondCameraTrack.close();
        setSecondCameraTrack(null);
      }

      if (customTrack) {
        try {
          clientRef.current?.unpublish([customTrack]);
          customTrack.close();
        } catch (error) {
          console.log("Custom track cleanup error:", error);
        }
      }
    };
  }, [isARHandActive]);

  // Combined video feed drawing function
  useEffect(() => {
    let drawInterval;
    const drawCombined = () => {
      const canvas = combinedCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const remoteVideo = document.querySelector('[id^="player-"] video');
      if (remoteVideo && secondCameraVideoRef.current) {
        canvas.width = remoteVideo.videoWidth || 640;
        canvas.height = remoteVideo.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.5;
        ctx.drawImage(
          secondCameraVideoRef.current,
          0,
          0,
          canvas.width,
          canvas.height
        );
        ctx.globalAlpha = 1.0;
      }
    };
    if (isARHandActive) {
      drawInterval = setInterval(drawCombined, 1000 / 30);
    }
    return () => {
      if (drawInterval) clearInterval(drawInterval);
    };
  }, [isARHandActive]);

  const endCall = () => {
    console.log("Ending call...");
    try {
      if (channelRef.current) {
        update(channelRef.current, { endCall: "true" });
      }

      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (window._screenTrack) {
        window._screenTrack.close();
        window._screenTrack = null;
      }

      if (clientRef.current) {
        clientRef.current
          .leave()
          .then(() => {
            console.log("Successfully left the channel");
          })
          .catch((err) => {
            console.error("Error leaving channel:", err);
          });
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setShowTitleDialog(true); // Show title dialog at end of call
      // Do not navigate or call onCallEnd until dialog is handled
    } catch (error) {
      console.error("Error ending call:", error);
      setShowTitleDialog(true);
    }
  };

  const handleFreeze = async (shouldFreeze) => {
    console.log("[ICE] handleFreeze called with parameter:", shouldFreeze);
    console.log("[ICE] Current freeze state:", isVideoFrozen);

    if (!callId) {
      console.error("Cannot toggle freeze: callId not available.");
      setError("Call ID is missing, cannot toggle freeze.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const currentCallRef = ref(database, `videoCalls/${callId}`);
    const newFreezeFirebaseValue =
      shouldFreeze !== undefined
        ? shouldFreeze
          ? "on"
          : "off"
        : isVideoFrozen
        ? "off"
        : "on";
    console.log("[ICE] Calculated new freeze state:", newFreezeFirebaseValue);

    try {
      if (newFreezeFirebaseValue === "on" && !frozenFrame) {
        console.log("[ICE] Capturing frame before setting freeze state");
        let frame;

        if (isARHandActive) {
          const canvas = combinedCanvasRef.current;
          if (canvas) {
            frame = canvas.toDataURL("image/jpeg", 0.9);
            console.log("[ICE] Captured AR frame successfully");
          } else {
            setError("AR overlay not ready. Please try freezing again in a moment.");
            setTimeout(() => setError(""), 3000);
            return;
          }
        } else {
          frame = await captureVideoFrame();
        }

        if (frame) {
          console.log("[ICE] Frame captured:", "success");
          setFrozenFrame(frame);
          if (channelRef.current) {
            update(channelRef.current, { frozenFrameUrl: frame });
          }
        }
      }

      console.log(
        `[ICE] Setting freeze state in Firebase to: ${newFreezeFirebaseValue} for call ${callId}`
      );
      await update(currentCallRef, {
        freeze: newFreezeFirebaseValue,
      });

      setIsVideoFrozen(newFreezeFirebaseValue === "on");
      setFreezeOverlayVisible(newFreezeFirebaseValue === "on");

      if (newFreezeFirebaseValue === "off") {
        console.log("[ICE] UNFREEZE SEQUENCE STARTING");
        setWasInCall(true);
        rebuildMediaConnections();

        setTimeout(() => {
          console.log("[ICE] Now clearing frozen frame");
          setFrozenFrame(null);
          if (window.FreezeManager) {
            window.FreezeManager.capturedFrame = null;
          }

          setTimeout(() => {
            if (Object.keys(remoteVideos).length === 0) {
              console.log(
                "[ICE] Still no video after unfreezing, trying one final media rebuild"
              );
              rebuildMediaConnections();
            }
          }, 500);
        }, 2500);
      }
    } catch (error) {
      console.error("Error toggling freeze state in Firebase:", error);
      setError("Failed to toggle video freeze state.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const rebuildMediaConnections = () => {
    console.log("[ICE] REBUILD: Starting full media connection rebuild");
    setWasInCall(true);

    const remoteUsers = clientRef.current?.remoteUsers || [];
    console.log(`[ICE] REBUILD: Found ${remoteUsers.length} remote users`);

    if (remoteUsers.length === 0) {
      console.log(
        "[ICE] REBUILD: No remote users found, will try again in 1 second"
      );
      setTimeout(rebuildMediaConnections, 1000);
      return;
    }

    remoteUsers.forEach((user) => {
      if (user.videoTrack) {
        const playerDiv = document.getElementById(`player-${user.uid}`);
        if (playerDiv) {
          try {
            console.log(`[ICE] REBUILD: Reinitializing video for ${user.uid}`);
            try {
              user.videoTrack.stop();
            } catch (stopErr) {
              console.log(
                `[ICE] REBUILD: Ignoring stop error: ${stopErr.message}`
              );
            }

            setTimeout(() => {
              try {
                user.videoTrack.play(playerDiv.id, { fit: "cover" });
                console.log(
                  `[ICE] REBUILD: Successfully rebuilt video for ${user.uid}`
                );

                setRemoteVideos((prev) => ({
                  ...prev,
                  [user.uid]: user.videoTrack,
                }));
              } catch (playErr) {
                console.error(
                  `[ICE] REBUILD: Failed to play video for ${user.uid}:`,
                  playErr
                );
              }
            }, 200);
          } catch (err) {
            console.warn(
              `[ICE] REBUILD: Error handling video for ${user.uid}:`,
              err
            );
          }
        } else {
          console.warn(
            `[ICE] REBUILD: Could not find player div for user ${user.uid}`
          );
        }
      }

      if (user.audioTrack) {
        try {
          console.log(`[ICE] REBUILD: Reinitializing audio for ${user.uid}`);
          try {
            user.audioTrack.stop();
          } catch (stopErr) {
            console.log(
              `🧊 REBUILD: Ignoring audio stop error: ${stopErr.message}`
            );
          }
          setTimeout(() => {
            try {
              user.audioTrack.play();
              console.log(
                `🧊 REBUILD: Successfully rebuilt audio for ${user.uid}`
              );
            } catch (err) {
              console.warn(`🧊 REBUILD: Error playing audio:`, err);
            }
          }, 200);
        } catch (err) {
          console.warn(
            `🧊 REBUILD: Error handling audio for ${user.uid}:`,
            err
          );
        }
      }
    });

    console.log("🧊 REBUILD: Media connection rebuild completed");
  };

  useEffect(() => {
    const resetTimer = () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }

      setShowControlsOverlay(true);

      controlsTimerRef.current = setTimeout(() => {
        setShowControlsOverlay(false);
      }, 5000);
    };

    resetTimer();

    const handleUserActivity = () => resetTimer();
    document.addEventListener("mousemove", handleUserActivity);
    document.addEventListener("click", handleUserActivity);
    document.addEventListener("keydown", handleUserActivity);

    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
      document.removeEventListener("mousemove", handleUserActivity);
      document.removeEventListener("click", handleUserActivity);
      document.removeEventListener("keydown", handleUserActivity);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message}`
        );
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (title) {
      setCallPurpose(title);
    } else {
      setCallPurpose("Remote Consultation");
    }

    if (uid) {
      uidRef.current = uid;
    }
  }, [title, uid]);

  useEffect(() => {
    if (callId) {
      const endCallRef = ref(database, `videoCalls/${callId}/endCall`);
      const unsubscribe = onValue(endCallRef, (snapshot) => {
        if (snapshot.exists()) {
          const endCallState = snapshot.val();
          if (endCallState === "true") {
            endCall();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [callId, endCall]);

  useEffect(() => {
    if (callId) {
      // Set channel reference for both old and new structures
      channelRef.current = ref(database, `videoCalls/${callId}`);

      // Get current user info
      const currentUserName =
        auth.currentUser?.displayName || `User ${uid.substring(0, 6)}`;
      const isFirstUser = !auth.currentUser?.uid; // If no auth UID, we're likely the first/creator

      // Initialize the new call data structure if needed
      const callRef = ref(database, `calls/${callId}`);
      get(callRef).then((snapshot) => {
        if (!snapshot.exists()) {
          // Create new call structure
          set(callRef, {
            createdAt: Date.now(),
            createdBy: uid,
            waitingRoomEnabled: true,
            viewMode: "grid",
            raisedHands: [],
            pinnedUsers: [],
            spotlightUser: null,
          });

          // Add first user as host
          const participantRef = ref(
            database,
            `calls/${callId}/participants/${uid}`
          );
          set(participantRef, {
            name: currentUserName,
            licenseId: uid, // Store the license ID
            joinTime: Date.now(),
            role: "host", // First user is always host
            isMuted: false,
            hasVideo: true,
            networkQuality: 5,
          });

          // Set our role as host
          setUserRole("host");

          // Update permissions for host
          setPermissions({
            canShareScreen: true,
            canRecord: true,
            canAnnotate: true,
            canSendMessages: true,
            canInviteOthers: true,
          });
        }
      });

      // Begin Agora call setup
      const setupAgoraCall = async () => {
        await joinAgoraCall(callId);
      };
      setupAgoraCall();

      // Get call purpose from old structure for backward compatibility
      get(channelRef.current).then((snapshot) => {
        if (snapshot.exists() && snapshot.val().purpose) {
          setCallPurpose(snapshot.val().purpose);
        }
      });

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      const annotationsRef = ref(database, `videoCalls/${callId}/annotations`);
      const unsubscribeAnnotations = onValue(annotationsRef, (snapshot) => {
        if (snapshot.exists()) {
          setAnnotations(snapshot.val());
        }
      });

      return () => {
        if (clientRef.current) {
          clientRef.current.leave();
        }
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.close();
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        unsubscribeAnnotations();
      };
    }
  }, [callId]);

  useEffect(() => {
    if (callId) {
      const freezeRef = ref(database, `videoCalls/${callId}/freeze`);
      const unsubscribe = onValue(freezeRef, (snapshot) => {
        const freezeState = snapshot.val();
        console.log("🧊 Firebase freeze state changed:", freezeState);

        const isFrozen = freezeState === "on";
        setIsVideoFrozen(isFrozen);
        setFreezeOverlayVisible(isFrozen);
        console.log("🧊 Updated local state - isVideoFrozen:", isFrozen);

        if (isFrozen && !frozenFrame) {
          console.log("🧊 No frozen frame available, capturing video frame");
          captureVideoFrame();
        } else if (!isFrozen) {
          console.log("🧊 FIREBASE UNFREEZE DETECTED");
          setWasInCall(true);
          rebuildMediaConnections();

          setTimeout(() => {
            console.log("🧊 First scheduled rebuild (500ms)");
            rebuildMediaConnections();

            setTimeout(() => {
              console.log("🧊 Second scheduled rebuild (1500ms)");
              rebuildMediaConnections();

              setTimeout(() => {
                console.log(
                  "🧊 Final scheduled task: clearing frozen frame (3000ms)"
                );
                setFrozenFrame(null);
                if (window.FreezeManager) {
                  window.FreezeManager.capturedFrame = null;
                }
              }, 1500);
            }, 1000);
          }, 500);
        }
      });
      return () => unsubscribe();
    }
  }, [callId, frozenFrame]);

  useEffect(() => {
    if (callId) {
      const stopVideoRef = ref(database, `videoCalls/${callId}`);
      get(stopVideoRef).then((snapshot) => {
        setStopVideoState(snapshot.val()?.stopVideo || "stop");
      });
    }
  }, [callId]);

  const captureVideoFrame = () => {
    console.log("🧊 captureVideoFrame function called");
    if (FreezeManager.capturedFrame) {
      console.log("🧊 Using existing cached frame");
      setFrozenFrame(FreezeManager.capturedFrame);
      return FreezeManager.capturedFrame;
    }

    console.log("🧊 No cached frame found, attempting to capture new frame");

    try {
      if (remoteVideoContainerRef.current) {
        const videos = document.querySelectorAll("video");
        const containerVideos =
          remoteVideoContainerRef.current.querySelectorAll("video");

        for (const video of [...videos, ...containerVideos]) {
          if (video && video.videoWidth && video.videoHeight && !video.paused) {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL("image/jpeg", 0.9);
            console.log("🧊 Successfully captured video frame");
            FreezeManager.capturedFrame = dataURL;
            setFrozenFrame(dataURL);
            setWasInCall(true);
            console.log("🧊 Setting wasInCall=true during freeze");

            if (channelRef.current) {
              update(channelRef.current, { frozenFrameUrl: dataURL });
            }

            return dataURL;
          }
        }
      }
    } catch (error) {
      console.warn("First capture approach failed:", error);
    }

    if (typeof html2canvas !== "undefined") {
      try {
        const containerElement = remoteVideoContainerRef.current;
        if (containerElement) {
          html2canvas(containerElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#000000",
          }).then((canvas) => {
            const dataURL = canvas.toDataURL("image/jpeg", 0.9);
            console.log("🧊 Successfully captured frame using html2canvas");
            FreezeManager.capturedFrame = dataURL;
            setFrozenFrame(dataURL);
            setWasInCall(true);
            console.log(
              "🧊 Setting wasInCall=true during freeze (html2canvas method)"
            );

            if (channelRef.current) {
              update(channelRef.current, { frozenFrameUrl: dataURL });
            }
          });
        }
      } catch (error) {
        console.warn("HTML2Canvas approach failed:", error);
      }
    }

    const fallbackImage =
      FreezeManager.fallbackImage || FreezeManager.createFallbackImage();
    if (fallbackImage) {
      setFrozenFrame(fallbackImage);
      if (channelRef.current) {
        update(channelRef.current, { frozenFrameUrl: fallbackImage });
      }
    }

    return null;
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      hours > 0 ? hours.toString().padStart(2, "0") : null,
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(callId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCall = () => {
    const shareUrl = `${window.location.origin}/join?callId=${callId}`;

    if (navigator.share) {
      navigator
        .share({
          title: `Join ${callPurpose}`,
          text: "Join my video call session",
          url: shareUrl,
        })
        .catch((err) => console.error("Share failed:", err));
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const joinAgoraCall = async (channelId) => {
    clientRef.current = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8",
      statsReportInterval: 0,
    });
    agoraEngine.current = clientRef.current;

    try {
      await clientRef.current.join(APP_ID, channelId, TOKEN, null);
      console.log("Successfully joined Agora channel:", channelId);
      setIsJoined(true);

      clientRef.current.on("user-published", handleUserPublished);
      clientRef.current.on("user-unpublished", handleUserUnpublished);
      clientRef.current.on("user-left", handleUserLeft);
      clientRef.current.on("exception", (event) => {
        console.warn("Agora exception:", event);
      });

      await joinChannelAndPublishTracks();

      if (channelRef.current) {
        get(channelRef.current).then((snapshot) => {
          if (!snapshot.exists()) {
            set(channelRef.current, {
              freeze: "off",
              annotations: {},
              frozenFrameUrl: null,
            });
          }
        });
      }
    } catch (err) {
      console.error("Agora initialization error:", err);
      setError("Failed to join call");
      setIsJoined(false);
    }
  };

  const joinChannelAndPublishTracks = async () => {
    try {
      // 1. Create and configure audio track
      localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current.setMuted(isMuted);

      // ✅ ALWAYS publish audio first
      await clientRef.current.publish([localAudioTrackRef.current]);
      console.log("🔊 Published audio track");

      // 2. Video will be handled by the useEffect based on isARHandActive state
      // Don't publish video here to avoid conflicts

      console.log(
        `✅ Published audio track, video will be handled by useEffect. AR Hand: ${isARHandActive}, muted: ${isMuted}`
      );
    } catch (error) {
      console.error("❌ Error during joinChannelAndPublishTracks:", error);

      if (error.message?.includes("video")) {
        setError("Failed to access camera. Please check camera permissions.");
      } else if (error.message?.includes("audio")) {
        setError(
          "Failed to access microphone. Please check audio permissions."
        );
      } else {
        setError("Failed to join channel with audio/video.");
      }

      setTimeout(() => setError(""), 4000);
    }
  };

  const handleUserPublished = async (user, mediaType) => {
    console.log(`User ${user.uid} published ${mediaType}`);
    try {
      await clientRef.current.subscribe(user, mediaType);
      console.log(`Subscribed to ${mediaType} track from user ${user.uid}`);

      if (mediaType === "video" && user.videoTrack) {
        console.log(`🎥 Video track details for user ${user.uid}:`, {
          trackId: user.videoTrack.getTrackId(),
          enabled: user.videoTrack.isEnabled,
          muted: user.videoTrack.muted,
        });

        const container = remoteVideoContainerRef.current;
        if (!container) {
          console.error("Remote video container not available");
          return;
        }

        let playerDiv = document.getElementById(`player-${user.uid}`);

        if (!playerDiv) {
          console.log(
            `🎥 Creating stable video container for user ${user.uid}`
          );

          playerDiv = document.createElement("div");
          playerDiv.id = `player-${user.uid}`;
          playerDiv.className = "video-stabilizer"; // Use different positioning based on view mode
          if (viewMode === "grid") {
            playerDiv.style.position = "relative";
            playerDiv.style.width = "100%";
            playerDiv.style.height = "100%";
            playerDiv.style.aspectRatio = "16/9";
          } else if (viewMode === "speaker") {
            const isSpotlighted = spotlightUser === user.uid;
            const isPinned = pinnedUsers.includes(user.uid);

            if (
              isSpotlighted ||
              isPinned ||
              (!spotlightUser && !pinnedUsers.length)
            ) {
              // Main speaker view
              playerDiv.style.position = "absolute";
              playerDiv.style.inset = "0";
              playerDiv.style.width = "100%";
              playerDiv.style.height = "100%";
              playerDiv.style.zIndex = "10";
              playerDiv.style.transition = "all 0.3s ease-in-out";
            } else {
              // Thumbnails in speaker view
              const remoteCount = Object.keys(remoteVideos).length;
              const thumbnailsArea = document.createElement("div");
              thumbnailsArea.id = "thumbnails-area";
              thumbnailsArea.style.position = "absolute";
              thumbnailsArea.style.bottom = "20px";
              thumbnailsArea.style.left = "50%";
              thumbnailsArea.style.transform = "translateX(-50%)";
              thumbnailsArea.style.zIndex = "20";
              thumbnailsArea.style.display = "flex";
              thumbnailsArea.style.justifyContent = "center";
              thumbnailsArea.style.gap = "10px";

              playerDiv.style.position = "relative";
              playerDiv.style.width = "160px";
              playerDiv.style.height = "90px";
              playerDiv.style.zIndex = "20";
              playerDiv.style.borderRadius = "8px";
              playerDiv.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.3)";
              playerDiv.style.border = "2px solid rgba(255, 255, 255, 0.1)";
              playerDiv.style.transition = "all 0.3s ease";

              // Add hover effect for highlighting
              playerDiv.addEventListener("mouseenter", () => {
                playerDiv.style.border = "2px solid rgba(59, 130, 246, 0.8)";
                playerDiv.style.transform = "scale(1.05)";
              });

              playerDiv.addEventListener("mouseleave", () => {
                playerDiv.style.border = "2px solid rgba(255, 255, 255, 0.1)";
                playerDiv.style.transform = "scale(1)";
              });

              // Add click handler to make this user the spotlight
              playerDiv.addEventListener("click", () => {
                toggleSpotlight(user.uid);
              });
            }
          } else if (viewMode === "sidebar") {
            const isMain =
              spotlightUser === user.uid ||
              pinnedUsers.includes(user.uid) ||
              (!spotlightUser &&
                !pinnedUsers.length &&
                Object.keys(remoteVideos)[0] === user.uid);

            if (isMain) {
              // Main view on the left
              playerDiv.style.position = "absolute";
              playerDiv.style.left = "0";
              playerDiv.style.top = "0";
              playerDiv.style.width = "75%";
              playerDiv.style.height = "100%";
              playerDiv.style.transition = "all 0.3s ease";
            } else {
              // Right sidebar videos
              const sidebarUsers = Object.keys(remoteVideos).filter(
                (id) => id !== spotlightUser && !pinnedUsers.includes(id)
              );
              const userIndex = sidebarUsers.indexOf(user.uid);
              const totalSidebar = sidebarUsers.length || 1;

              playerDiv.style.position = "absolute";
              playerDiv.style.right = "0";
              playerDiv.style.top = `${(userIndex / totalSidebar) * 100}%`;
              playerDiv.style.width = "25%";
              playerDiv.style.height = `${100 / totalSidebar}%`;
              playerDiv.style.borderBottom =
                "1px solid rgba(255, 255, 255, 0.1)";
              playerDiv.style.transition = "all 0.3s ease";

              // Add click handler to make this user the spotlight
              playerDiv.addEventListener("click", () => {
                toggleSpotlight(user.uid);
              });
            }
          } else {
            // Default fallback
            playerDiv.style.position = "absolute";
            playerDiv.style.inset = "0";
            playerDiv.style.width = "100%";
            playerDiv.style.height = "100%";
          }

          playerDiv.style.transform = "translateZ(0)";
          playerDiv.style.willChange = "transform";
          playerDiv.style.backfaceVisibility = "hidden";
          playerDiv.style.objectFit = "cover";
          container.appendChild(playerDiv);

          // Add hand raised indicator if applicable
          if (raisedHands.includes(user.uid)) {
            const handIndicator = document.createElement("div");
            handIndicator.className = "hand-indicator";
            handIndicator.style.position = "absolute";
            handIndicator.style.top = "10px";
            handIndicator.style.left = "10px";
            handIndicator.style.backgroundColor = "#EAB308"; // yellow-500
            handIndicator.style.borderRadius = "50%";
            handIndicator.style.width = "32px";
            handIndicator.style.height = "32px";
            handIndicator.style.display = "flex";
            handIndicator.style.alignItems = "center";
            handIndicator.style.justifyContent = "center";
            handIndicator.style.zIndex = "30";
            handIndicator.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hand"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>';
            playerDiv.appendChild(handIndicator);
          }

          // Add user role and name badge
          const userData = participants[user.uid] || {};
          const userRole = userData.role || "participant";
          const userName =
            userData.name || `User ${user.uid.toString().substring(0, 6)}`;

          const nameBadge = document.createElement("div");
          nameBadge.className = "name-badge";
          nameBadge.style.position = "absolute";
          nameBadge.style.bottom = "10px";
          nameBadge.style.left = "10px";
          nameBadge.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
          nameBadge.style.backdropFilter = "blur(4px)";
          nameBadge.style.borderRadius = "4px";
          nameBadge.style.padding = "4px 8px";
          nameBadge.style.display = "flex";
          nameBadge.style.alignItems = "center";
          nameBadge.style.zIndex = "30";

          const roleBadgeColor =
            userRole === "host"
              ? "#EAB308" // yellow-500
              : userRole === "participant"
              ? "#3B82F6" // blue-500
              : "#6B7280"; // gray-500

          nameBadge.innerHTML = `
            <span style="font-size: 12px; color: white; margin-right: 4px;">${userName}</span>
            <span style="font-size: 10px; background-color: ${roleBadgeColor}; color: white; padding: 2px 4px; border-radius: 4px;">${userRole}</span>
          `;

          playerDiv.appendChild(nameBadge);

          console.log(
            `🎥 Attempting to play video for user ${user.uid} in element: ${playerDiv.id}`
          );
          try {
            user.videoTrack.play(playerDiv.id, { fit: "cover" });
            console.log(`🎥 Video playback initiated for user ${user.uid}`);

            const videoElement = playerDiv.querySelector("video");
            if (videoElement) {
              videoElement.addEventListener("playing", () => {
                console.log(`🎥 Video is now playing for user ${user.uid}`);
              });
              videoElement.addEventListener("error", (e) => {
                console.error(
                  `🎥 Error in video playback for user ${user.uid}:`,
                  e
                );
              });
            } else {
              console.warn(
                `🎥 Could not find video element in player div for user ${user.uid}`
              );
            }

            console.log(
              `🎥 Adding video track for user ${user.uid} to remoteVideos state`
            );
            setRemoteVideos((prev) => {
              const updated = {
                ...prev,
                [user.uid]: user.videoTrack,
              };
              console.log(`🎥 Updated remoteVideos state:`, updated);
              return updated;
            });
          } catch (err) {
            console.error(`🎥 Failed to play video for user ${user.uid}:`, err);
          }
        }
      }

      if (mediaType === "audio") {
        console.log(`🔊 Playing audio for user ${user.uid}`);
        try {
          user.audioTrack.play();
          console.log(`🔊 Audio playback initiated for user ${user.uid}`);
        } catch (err) {
          console.error(`🔊 Failed to play audio for user ${user.uid}:`, err);
        }
      }
    } catch (error) {
      console.error("Error handling user published event:", error);
    }
  };

  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === "video") {
      setRemoteVideos((prev) => {
        const updated = { ...prev };
        delete updated[user.uid];
        return updated;
      });
    }
  };

  const handleUserLeft = (user) => {
    console.log(`User ${user.uid} left`);

    const playerDiv = document.getElementById(`player-${user.uid}`);
    if (playerDiv && playerDiv.parentNode) {
      playerDiv.parentNode.removeChild(playerDiv);
    }

    setRemoteVideos((prev) => {
      const updated = { ...prev };
      delete updated[user.uid];
      return updated;
    });

    if (activeRemoteUid === user.uid) {
      setIsAnnotating(false);
      setActiveRemoteUid(null);
    }
  };

  const handleSendMessage = async (message) => {
    if (!message.trim() || !callId) return;

    try {
      const messagesRef = ref(database, `videoCalls/${callId}/messages`);
      const newMessageRef = push(messagesRef);

      const messageData = {
        id: newMessageRef.key,
        text: message,
        userId: auth.currentUser?.uid || uid || "anonymous",
        userName: auth.currentUser?.displayName || "User",
        timestamp: Date.now(),
      };

      await set(newMessageRef, messageData);
      setMessages((prevMessages) => [...prevMessages, messageData]);
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");

      setTimeout(() => {
        setError("");
      }, 3000);
    }
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsersToInvite((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const fetchAvailableUsers = async () => {
    console.log("Fetching available users...");
    setInviteLoading(true);

    try {
      const currentUserId =
        searchParams.get("uid") ||
        (auth.currentUser ? auth.currentUser.uid : null);
      if (!currentUserId) {
        console.error("No user ID available");
        setInviteLoading(false);
        return;
      }

      let activeParticipants = [];
      try {
        const callRef = ref(database, `videoCalls/${callId}`);
        const callSnapshot = await get(callRef);

        if (callSnapshot.exists()) {
          const videoCallData = callSnapshot.val();

          if (videoCallData.users) {
            if (Array.isArray(videoCallData.users)) {
              activeParticipants = videoCallData.users;
            } else if (typeof videoCallData.users === "object") {
              activeParticipants = Object.keys(videoCallData.users);
            }
          }

          console.log("Active participants:", activeParticipants);
        }
      } catch (error) {
        console.error("Error fetching active participants:", error);
      }

      let availableToInvite = [];

      try {
        const onlineUsersRef = ref(database, "active_users");
        const onlineUsersSnapshot = await get(onlineUsersRef);

        if (onlineUsersSnapshot.exists()) {
          onlineUsersSnapshot.forEach((childSnapshot) => {
            const userId = childSnapshot.key;
            if (
              userId !== currentUserId &&
              !activeParticipants.includes(userId)
            ) {
              availableToInvite.push(userId);
            }
          });
        }
      } catch (error) {
        console.error("Error fetching online users:", error);
      }

      if (availableToInvite.length === 0) {
        try {
          const usersRef = ref(database, "users");
          const usersSnapshot = await get(usersRef);

          if (usersSnapshot.exists()) {
            usersSnapshot.forEach((childSnapshot) => {
              const userId = childSnapshot.key;
              if (
                userId !== currentUserId &&
                !activeParticipants.includes(userId)
              ) {
                availableToInvite.push(userId);
              }
            });
          }
        } catch (error) {
          console.error("Error fetching all users:", error);
        }
      }

      console.log("Users available to invite:", availableToInvite);
      setAvailableUsers(availableToInvite);

      if (availableToInvite.length === 0) {
        console.log(
          "No users found in database, using test users for development"
        );
        setAvailableUsers(["user1", "user2", "user3", "user4", "user5"]);
      }
    } catch (error) {
      console.error("Error in fetchAvailableUsers:", error);
      setAvailableUsers(["test1", "test2", "test3"]);
    } finally {
      setInviteLoading(false);
    }
  };

  const sendInvitations = async () => {
    if (selectedUsersToInvite.length === 0) return;

    setInviteLoading(true);
    try {
      const senderId = auth.currentUser?.uid || uid;
      let senderName = senderId;

      try {
        const userRef = ref(database, `users/${senderId}`);
        const userSnapshot = await get(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          if (userData.name || userData.displayName || userData.email) {
            senderName =
              userData.name || userData.displayName || userData.email;
          }
        }
      } catch (err) {
        console.log("Could not fetch sender name", err);
      }

      const callRef = ref(database, `videoCalls/${callId}`);
      const callSnapshot = await get(callRef);
      const callData = callSnapshot.exists() ? callSnapshot.val() : {};
      const callTitle =
        callData.title || searchParams.get("title") || "Untitled Call";

      await Promise.all(
        selectedUsersToInvite.map(async (userId) => {
          const incomingCallRef = ref(
            database,
            `active_users/${userId}/incoming_calls`
          );
          const newCallNotification = push(incomingCallRef);

          await set(newCallNotification, {
            id: newCallNotification.key,
            roomId: callId,
            userId: senderId,
            name: senderName,
            status: "pending",
            timestamp: Date.now(),
            title: callTitle,
            isNew: true,
            type: "invitation",
          });

          await update(ref(database, `videoCalls/${callId}`), {
            [`users/${userId}`]: {
              invited: true,
              invitedBy: senderId,
              invitedAt: Date.now(),
              status: "invited",
            },
          });

          const notificationRef = ref(
            database,
            `active_users/${userId}/notifications`
          );
          await set(notificationRef, {
            type: "call_invitation",
            callId: callId,
            senderId: senderId,
            senderName: senderName,
            message: `${senderName} is inviting you to join a call: ${callTitle}`,
            timestamp: Date.now(),
          });
        })
      );

      setShowInviteDialog(false);
      setSelectedUsersToInvite([]);
    } catch (error) {
      console.error("Error sending invitations:", error);
      alert("Failed to send invitations: " + error.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const updateUserRole = (userId, newRole) => {
    if (!callId) return;

    // Update in Firebase
    const participantRef = ref(
      database,
      `calls/${callId}/participants/${userId}`
    );
    update(participantRef, { role: newRole })
      .then(() => {
        // Update local state
        setParticipants((prev) => ({
          ...prev,
          [userId]: {
            ...(prev[userId] || {}),
            role: newRole,
          },
        }));

        // If this is the current user, update userRole state
        if (userId === uid) {
          setUserRole(newRole);

          // Update permissions based on role
          const newPermissions = {
            canShareScreen: newRole === "host" || newRole === "participant",
            canRecord: newRole === "host",
            canAnnotate: newRole === "host" || newRole === "participant",
            canSendMessages: newRole === "host" || newRole === "participant",
            canInviteOthers: newRole === "host",
          };

          setPermissions(newPermissions);
        }
      })
      .catch((error) => {
        console.error("Error updating user role:", error);
      });
  };

  const toggleWaitingRoom = (enabled) => {
    if (!callId) return;

    // Update in Firebase
    const callRef = ref(database, `calls/${callId}`);
    update(callRef, { waitingRoomEnabled: enabled })
      .then(() => {
        setWaitingRoomEnabled(enabled);
      })
      .catch((error) => {
        console.error("Error toggling waiting room:", error);
      });
  };

  const admitUser = (userId) => {
    if (!callId) return;

    const userRef = ref(database, `calls/${callId}/waitingRoom/${userId}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();

        // Move user from waiting room to participants
        const updates = {};
        updates[`calls/${callId}/waitingRoom/${userId}`] = null;
        updates[`calls/${callId}/participants/${userId}`] = {
          ...userData,
          licenseId: userId,
          id: userId,
          joinTime: Date.now(),
          role: "participant",
        };

        update(ref(database), updates)
          .then(() => {
            setWaitingUsers((prev) =>
              prev.filter((user) => user.id !== userId)
            );
          })
          .catch((error) => {
            console.error("Error admitting user:", error);
          });
      }
    });
  };

  const denyUser = (userId) => {
    if (!callId) return;

    const userRef = ref(database, `calls/${callId}/waitingRoom/${userId}`);
    update(userRef, { denied: true })
      .then(() => {
        // Remove from local waiting users state
        setWaitingUsers((prev) => prev.filter((user) => user.id !== userId));
      })
      .catch((error) => {
        console.error("Error denying user:", error);
      });
  };

  const admitAll = () => {
    if (!callId || waitingUsers.length === 0) return;

    const updates = {};

    waitingUsers.forEach((user) => {
      updates[`calls/${callId}/waitingRoom/${user.id}`] = null;
      updates[`calls/${callId}/participants/${user.id}`] = {
        name: user.name,
        licenseId: user.id,
        id: user.id,
        joinTime: Date.now(),
        role: "participant",
      };
    });

    update(ref(database), updates)
      .then(() => {
        setWaitingUsers([]);
      })
      .catch((error) => {
        console.error("Error admitting all users:", error);
      });
  };

  const denyAll = () => {
    if (!callId || waitingUsers.length === 0) return;

    const updates = {};

    waitingUsers.forEach((user) => {
      updates[`calls/${callId}/waitingRoom/${user.id}/denied`] = true;
    });

    update(ref(database), updates)
      .then(() => {
        setWaitingUsers([]);
      })
      .catch((error) => {
        console.error("Error denying all users:", error);
      });
  };

  const toggleParticipantPanel = () => {
    setShowParticipantPanel((prev) => !prev);
  };

  const toggleMuteParticipant = (userId) => {
    if (!callId) return;

    const participantRef = ref(
      database,
      `calls/${callId}/participants/${userId}`
    );
    get(participantRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        update(participantRef, { isMuted: !userData.isMuted }).then(() => {
          setParticipants((prev) => ({
            ...prev,
            [userId]: {
              ...(prev[userId] || {}),
              isMuted: !userData.isMuted,
            },
          }));
        });
      }
    });
  };

  const toggleVideoParticipant = (userId) => {
    if (!callId) return;

    const participantRef = ref(
      database,
      `calls/${callId}/participants/${userId}`
    );
    get(participantRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        update(participantRef, { hasVideo: !userData.hasVideo }).then(() => {
          setParticipants((prev) => ({
            ...prev,
            [userId]: {
              ...(prev[userId] || {}),
              hasVideo: !userData.hasVideo,
            },
          }));
        });
      }
    });
  };

  const toggleSpotlight = (userId) => {
    if (!callId) return;

    // If already spotlighted, remove spotlight
    if (spotlightUser === userId) {
      setSpotlightUser(null);

      // Update in Firebase
      const callRef = ref(database, `calls/${callId}`);
      update(callRef, { spotlightUser: null });
    } else {
      // Add spotlight to this user
      setSpotlightUser(userId);

      // Update in Firebase
      const callRef = ref(database, `calls/${callId}`);
      update(callRef, { spotlightUser: userId });
    }
  };

  const toggleUserPin = (userId) => {
    if (!callId) return;

    const isPinned = pinnedUsers.includes(userId);
    let newPinnedUsers;

    if (isPinned) {
      // Unpin the user
      newPinnedUsers = pinnedUsers.filter((pinUserId) => pinUserId !== userId);
    } else {
      // Pin the user
      newPinnedUsers = [...pinnedUsers, userId];
    }

    setPinnedUsers(newPinnedUsers);

    // Update in Firebase
    if (userRole === "host") {
      const callRef = ref(database, `calls/${callId}`);
      update(callRef, { pinnedUsers: newPinnedUsers });
    }
  };

  const toggleRaiseHand = () => {
    if (!callId || !uid) return;

    const isHandRaised = raisedHands.includes(uid);

    if (isHandRaised) {
      // Lower hand
      setRaisedHands((prev) => prev.filter((id) => id !== uid));

      // Update in Firebase
      const callRef = ref(database, `calls/${callId}`);
      update(callRef, { raisedHands: raisedHands.filter((id) => id !== uid) });
    } else {
      // Raise hand
      setRaisedHands((prev) => [...prev, uid]);

      // Update in Firebase
      const callRef = ref(database, `calls/${callId}`);
      update(callRef, { raisedHands: [...raisedHands, uid] });
    }
  };

  const lowerParticipantHand = (userId) => {
    if (!callId) return;

    setRaisedHands((prev) => prev.filter((id) => id !== userId));

    // Update in Firebase
    const callRef = ref(database, `calls/${callId}`);
    update(callRef, { raisedHands: raisedHands.filter((id) => id !== userId) });
  };

  const changeViewMode = (mode) => {
    if (!["grid", "speaker", "sidebar"].includes(mode)) return;

    setViewMode(mode);

    // Update in Firebase if you're the host
    if (userRole === "host" && callId) {
      const callRef = ref(database, `calls/${callId}`);
      update(callRef, { viewMode: mode });
    }
  };

  const removeParticipant = (userId) => {
    if (!callId || userRole !== "host") return;

    const participantRef = ref(
      database,
      `calls/${callId}/participants/${userId}`
    );
    update(participantRef, { removed: true }).then(() => {
      // Local state update
      const newParticipants = { ...participants };
      delete newParticipants[userId];
      setParticipants(newParticipants);
    });
  };

  const sendDirectMessage = (userId) => {
    // Open chat panel if not already open
    if (!isChatOpen) {
      setIsChatOpen(true);
    }

    // Here you would implement the logic to set up a direct message to this user
    // For now, we'll just log it
    console.log(`Setting up direct message to user ${userId}`);
  };

  useEffect(() => {
    if (!callId) return;

    // 1. Listen for user roles and participants changes
    const participantsRef = ref(database, `calls/${callId}/participants`);
    const participantsUnsubscribe = onValue(participantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const participantsData = snapshot.val();
        setParticipants(participantsData);

        // Update current user's role and permissions if needed
        if (participantsData[uid] && participantsData[uid].role) {
          setUserRole(participantsData[uid].role);

          // Update permissions based on role
          const newRole = participantsData[uid].role;
          setPermissions({
            canShareScreen: newRole === "host" || newRole === "participant",
            canRecord: newRole === "host",
            canAnnotate: newRole === "host" || newRole === "participant",
            canSendMessages: newRole === "host" || newRole === "participant",
            canInviteOthers: newRole === "host",
          });
        }
      }
    });

    // 2. Listen for waiting room changes
    const waitingRoomRef = ref(database, `calls/${callId}/waitingRoom`);
    const waitingRoomUnsubscribe = onValue(waitingRoomRef, (snapshot) => {
      if (snapshot.exists()) {
        const waitingRoomData = snapshot.val();

        // Filter out users who were denied
        const filteredUsers = Object.entries(waitingRoomData)
          .filter(([, userData]) => !userData.denied)
          .map(([userId, userData]) => ({
            id: userId,
            name: userData.name || `User ${userId.substring(0, 6)}`,
            joinTime: userData.joinTime || Date.now(),
          }));

        setWaitingUsers(filteredUsers);

        // Show waiting room dialog for host if there are users waiting
        if (
          userRole === "host" &&
          filteredUsers.length > 0 &&
          !showWaitingRoomDialog
        ) {
          setShowWaitingRoomDialog(true);
        }
      } else {
        setWaitingUsers([]);
      }
    });

    // 3. Listen for call settings
    const callRef = ref(database, `calls/${callId}`);
    const callSettingsUnsubscribe = onValue(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const callData = snapshot.val();

        // Update waiting room enabled
        if ("waitingRoomEnabled" in callData) {
          setWaitingRoomEnabled(callData.waitingRoomEnabled);
        }

        // Update spotlighted user
        if ("spotlightUser" in callData) {
          setSpotlightUser(callData.spotlightUser);
        }

        // Update raised hands
        if ("raisedHands" in callData) {
          setRaisedHands(callData.raisedHands || []);
        }

        // Update view mode if we're not the host
        if ("viewMode" in callData && userRole !== "host") {
          setViewMode(callData.viewMode);
        }

        // Update pinned users
        if ("pinnedUsers" in callData) {
          setPinnedUsers(callData.pinnedUsers || []);
        }
      }
    });

    // Set up participant joining procedure based on waiting room status
    const handleParticipantJoining = async () => {
      if (!callId || !uid) return;

      try {
        const callRef = ref(database, `calls/${callId}`);
        const snapshot = await get(callRef);

        // If call exists in new structure
        if (snapshot.exists()) {
          const callData = snapshot.val();

          // Check if user is already in participants list
          const participantsSnapshot = await get(
            ref(database, `calls/${callId}/participants/${uid}`)
          );
          if (participantsSnapshot.exists()) {
            // User is already a participant, update their status
            const userData = participantsSnapshot.val();
            setUserRole(userData.role || "participant");

            // Update permissions based on role
            const role = userData.role || "participant";
            setPermissions({
              canShareScreen: role === "host" || role === "participant",
              canRecord: role === "host",
              canAnnotate: role === "host" || role === "participant",
              canSendMessages: role === "host" || role === "participant",
              canInviteOthers: role === "host",
            });

            return;
          }

          // Get current user info
          const currentUserName =
            auth.currentUser?.displayName || `User ${uid.substring(0, 6)}`;

          // If the waiting room is enabled and user is not the creator
          if (callData.waitingRoomEnabled && callData.createdBy !== uid) {
            // Add user to waiting room
            const waitingUserRef = ref(
              database,
              `calls/${callId}/waitingRoom/${uid}`
            );
            await set(waitingUserRef, {
              name: currentUserName,
              joinTime: Date.now(),
            });

            console.log("User added to waiting room");
          } else {
            // Add user directly as participant
            const participantRef = ref(
              database,
              `calls/${callId}/participants/${uid}`
            );
            await set(participantRef, {
              name: currentUserName,
              licenseId: uid, // Store the license ID
              joinTime: Date.now(),
              role: "participant",
              isMuted: false,
              hasVideo: true,
              networkQuality: 5,
            });

            setUserRole("participant");

            console.log("User added as participant");
          }
        } else {
          // Create call structure since it doesn't exist yet
          await set(callRef, {
            createdAt: Date.now(),
            createdBy: uid,
            waitingRoomEnabled: true,
            viewMode: "grid",
            raisedHands: [],
            pinnedUsers: [],
            spotlightUser: null,
          });

          // Add user as host since they're creating the call
          const participantRef = ref(
            database,
            `calls/${callId}/participants/${uid}`
          );
          const currentUserName =
            auth.currentUser?.displayName || `User ${uid.substring(0, 6)}`;
          await set(participantRef, {
            name: currentUserName,
            licenseId: uid, // Store the license ID
            joinTime: Date.now(),
            role: "host",
            isMuted: false,
            hasVideo: true,
            networkQuality: 5,
          });

          setUserRole("host");

          // Update permissions for host
          setPermissions({
            canShareScreen: true,
            canRecord: true,
            canAnnotate: true,
            canSendMessages: true,
            canInviteOthers: true,
          });

          console.log("Call created, user added as host");
        }
      } catch (error) {
        console.error("Error handling participant joining:", error);
      }
    };

    handleParticipantJoining();

    // Cleanup function
    return () => {
      participantsUnsubscribe();
      waitingRoomUnsubscribe();
      callSettingsUnsubscribe();
    };
  }, [callId, uid, userRole, showWaitingRoomDialog]);

  useEffect(() => {
    const remoteVideoCount = Object.keys(remoteVideos).length;
    const hasRemoteUsers = clientRef.current?.remoteUsers?.length > 0;
    const hasAudioTracks = clientRef.current?.remoteUsers?.some(
      (user) => user.audioTrack
    );
    const wasPreviouslyFrozen = isVideoFrozen || frozenFrame !== null;

    console.log(
      `🔊 Call state check: remoteVideos=${remoteVideoCount}, remoteUsers=${hasRemoteUsers}, audioTracks=${hasAudioTracks}, wasInCall=${wasInCall}, frozenStatus=${wasPreviouslyFrozen}`
    );

    if (
      (remoteVideoCount > 0 ||
        hasRemoteUsers ||
        hasAudioTracks ||
        wasPreviouslyFrozen) &&
      !wasInCall
    ) {
      console.log(
        "🔄 Setting wasInCall to true due to detected participants or recent unfreeze"
      );
      setWasInCall(true);
    }
  }, [remoteVideos, frozenFrame, isVideoFrozen]);

  useEffect(() => {
    if (!wasInCall) {
      const hasAudioButNoVideo =
        clientRef.current?.remoteUsers?.some((user) => user.audioTrack) &&
        Object.keys(remoteVideos).length === 0;

      if (hasAudioButNoVideo) {
        console.log(
          "🔊 AUDIO ONLY DETECTED: Setting wasInCall=true even though video is not visible yet"
        );
        setWasInCall(true);
      }
    }
  }, [clientRef.current?.remoteUsers]);

  useEffect(() => {
    const remoteCount = Object.keys(remoteVideos).length;
    if (remoteCount === 1 && viewMode !== "speaker") {
      setViewMode("speaker");
    } else if (remoteCount > 1 && viewMode === "speaker") {
      setViewMode("grid");
    }
  }, [remoteVideos, viewMode]);

  const handleTitleDialogSubmit = (title) => {
    setShowTitleDialog(false);
    if (typeof onCallEnd === "function") {
      onCallEnd();
    }
    navigate("/dashboard");
  };
  const handleTitleDialogClose = () => {
    setShowTitleDialog(false);
    if (typeof onCallEnd === "function") {
      onCallEnd();
    }
    navigate("/dashboard");
  };

  useEffect(() => {
    // Only run when unfreezing: frozenFrame is visible, but isVideoFrozen is now false
    if (!isVideoFrozen && frozenFrame) {
      // Try to find a remote video element
      const container = remoteVideoContainerRef.current;
      let cleared = false;
      let timeoutId;
      if (container) {
        const video = container.querySelector("video");
        if (video) {
          const handlePlaying = () => {
            if (!cleared) {
              cleared = true;
              setTimeout(() => setFrozenFrame(null), 100); // fade out after video is playing
              video.removeEventListener("playing", handlePlaying);
              if (timeoutId) clearTimeout(timeoutId);
            }
          };
          video.addEventListener("playing", handlePlaying);
          // Fallback: clear after 2s if event doesn't fire
          timeoutId = setTimeout(() => {
            if (!cleared) {
              cleared = true;
              setFrozenFrame(null);
              video.removeEventListener("playing", handlePlaying);
            }
          }, 2000);
          // Clean up
          return () => {
            video.removeEventListener("playing", handlePlaying);
            if (timeoutId) clearTimeout(timeoutId);
          };
        } else {
          // No video found, fallback: clear after 2s
          timeoutId = setTimeout(() => setFrozenFrame(null), 2000);
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [isVideoFrozen, frozenFrame]);

  return (
    <div
      ref={videoContainerRef}
      className="relative w-full h-screen overflow-hidden bg-black"
    >
      <Pointer
        callId={callId}
        uid={uid}
        cursorActive={cursorActive}
        setCursorActive={setCursorActive}
      />
      {/* Header with premium design - shows/hides with controls */}
      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-opacity duration-300 ease-in-out ${
          showControlsOverlay ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <div className="bg-gradient-to-r from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/30 border border-blue-400/20">
                  <Shield
                    size={24}
                    className="text-white drop-shadow filter-shadow"
                  />
                </div>
              </div>

              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
                  {callPurpose}
                </h1>
                <div className="flex items-center text-gray-300 text-sm mt-1.5">
                  <div className="flex items-center bg-gray-800/50 rounded-full px-2.5 py-1 border border-white/10 shadow-inner">
                    <Clock size={12} className="mr-1.5 text-blue-400" />
                    <span className="font-medium text-xs text-blue-100">
                      {formatTime(callDuration)}
                    </span>
                  </div>
                  <span className="mx-2 text-gray-500">•</span>
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5 animate-pulse shadow-sm shadow-green-500/50"></div>
                    <span className="text-gray-400">Secure Connection</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-gray-800/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/5 shadow-lg">
                <span className="text-gray-400 mr-2 text-sm font-medium">
                  Room:
                </span>
                <span className="text-blue-400 font-mono font-medium tracking-wide">
                  {callId?.substring(0, 8)}
                </span>
                <button
                  onClick={copyRoomId}
                  className="ml-2 text-gray-400 hover:text-white bg-gray-700/70 hover:bg-gray-600/70 rounded-full p-1.5 transition-colors border border-white/5"
                >
                  {copied ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              <button
                onClick={toggleFullScreen}
                className="p-2.5 rounded-xl bg-gray-800/70 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-colors border border-white/5 shadow-lg"
                title="Toggle fullscreen"
              >
                <ZoomIn size={18} />
              </button>

              <button
                onClick={shareCall}
                className="flex items-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-xl transition-transform hover:scale-105 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 border border-blue-400/20"
              >
                <Share2 size={16} className="mr-2 drop-shadow-sm" />
                <span className="font-medium drop-shadow-sm">Invite</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content Area (Video Container) - Full height with padding for nav and controls */}
      <div className="absolute inset-0 pt-[60px] pb-[76px]">
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
          {" "}
          {/* Layout Controls - Top left corner */}
          {(userRole === "host" || userRole === "participant") && (
            <div className="absolute top-4 left-4 z-30 flex items-center bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 p-1">
              <button
                onClick={() => changeViewMode("grid")}
                className={`p-2 rounded-lg flex items-center ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
                title="Grid View"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => changeViewMode("speaker")}
                className={`p-2 rounded-lg flex items-center ${
                  viewMode === "speaker"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
                title="Speaker View"
              >
                <Maximize2 size={18} />
              </button>
              <button
                onClick={() => changeViewMode("sidebar")}
                className={`p-2 rounded-lg flex items-center ${
                  viewMode === "sidebar"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
                title="Sidebar View"
              >
                <Layout size={18} />
              </button>
            </div>
          )}
          {/* Participants Button - Top right corner */}
          <button
            onClick={toggleParticipantPanel}
            className="absolute top-4 right-4 z-50 flex items-center bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-2 md:top-6 md:right-6 md:p-4 sm:top-2 sm:right-2 sm:p-1 sm:text-xs"
            title="Participants"
          >
            <Users size={18} className="mr-2 sm:w-4 sm:h-4 md:w-6 md:h-6" />
            <span className="text-sm font-medium hidden sm:inline">
              {Object.keys(participants).length}
            </span>
          </button>
          {/* Raise Hand Button - Bottom left corner (removed for simplicity) */}
          {/*
          <button
            onClick={toggleRaiseHand}
            className={`absolute bottom-4 left-4 z-30 flex items-center p-3 rounded-full shadow-lg ${raisedHands.includes(uid) ? "bg-yellow-500 text-white" : "bg-gray-800/80 backdrop-blur-sm border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700"}`}
            title={raisedHands.includes(uid) ? "Lower Hand" : "Raise Hand"}
          >
            <Hand size={22} />
          </button>
          */}
          {/* Video container - Full size with maintained aspect ratio */}{" "}
          <div className="relative w-full h-full max-w-[1920px] max-h-[1080px] overflow-hidden">
            {" "}
            {/* Local video container - positioned on the left side */}
            <div className="absolute inset-0 flex items-center justify-center">
              {" "}
              {/* Remote video container */}
              <div
                ref={remoteVideoContainerRef}
                className={`absolute inset-0 bg-black ${
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
                    : viewMode === "speaker"
                    ? "flex items-center justify-center"
                    : viewMode === "sidebar"
                    ? "flex flex-row"
                    : ""
                }`}
                style={{
                  transform: "translateZ(0)",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  zIndex: 10,
                  transition: "all 0.3s ease",
                }}
              >
                <ScreenShare
                  ref={screenShareRef}
                  clientRef={clientRef}
                  isScreenSharing={isScreenSharing}
                  setIsScreenSharing={setIsScreenSharing}
                  setRemoteVideos={setRemoteVideos}
                  remoteVideoContainerRef={remoteVideoContainerRef}
                  localVideoTrackRef={localVideoTrackRef}
                />
                {(() => {
                  const remoteVideoCount = Object.keys(remoteVideos).length;
                  console.log(
                    `🎥 Remote video status: ${remoteVideoCount} tracks available`,
                    Object.keys(remoteVideos).map((uid) => ({
                      uid,
                      enabled: remoteVideos[uid]?.isEnabled,
                      muted: remoteVideos[uid]?.muted,
                    }))
                  );

                  const hasActiveVideos =
                    remoteVideoContainerRef.current?.querySelectorAll("video")
                      ?.length > 0;
                  console.log(
                    `🎥 Has active video elements: ${hasActiveVideos}`
                  );

                  const hasActiveAudio =
                    clientRef.current?.remoteUsers?.some(
                      (user) => user.audioTrack
                    ) || false;
                  const wasRecentlyFrozen =
                    isVideoFrozen || frozenFrame !== null;
                  const unfreezeTransitionInProgress =
                    frozenFrame !== null && !isVideoFrozen;
                  const isJustJoined = isJoined && callDuration < 5;

                  const showWaitingForParticipants =
                    remoteVideoCount === 0 &&
                    !wasRecentlyFrozen &&
                    !unfreezeTransitionInProgress &&
                    !wasInCall &&
                    !hasActiveAudio &&
                    !isJustJoined;
                  const hasVideoPlaying =
                    hasActiveVideos ||
                    remoteVideoCount > 0 ||
                    wasRecentlyFrozen ||
                    hasActiveAudio;

                  console.log(
                    `🎥 Decision: showWaitingForParticipants=${showWaitingForParticipants}, hasVideoPlaying=${hasVideoPlaying}, isVideoFrozen=${isVideoFrozen}, wasRecentlyFrozen=${wasRecentlyFrozen}`
                  );

                  if (showWaitingForParticipants) {
                    return (
                      // No remote videos, show waiting screen
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
                        <div className="mb-6">
                          <Camera className="w-16 h-16 text-blue-400 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">
                          Waiting for participants...
                        </h2>
                        <p className="text-gray-400">
                          Your call is ready. Share the call link to invite
                          others.
                        </p>

                        <div className="mt-8 flex items-center space-x-3">
                          <div className="flex items-center bg-gray-800/70 backdrop-blur px-4 py-2 rounded-lg border border-gray-700">
                            <span className="text-gray-300 mr-2 font-medium">
                              ID:
                            </span>
                            <span className="text-blue-400 font-mono">
                              {callId}
                            </span>
                            <button
                              onClick={copyRoomId}
                              className="ml-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50"
                            >
                              {copied ? (
                                <CheckCircle
                                  size={18}
                                  className="text-green-500"
                                />
                              ) : (
                                <Copy size={18} />
                              )}
                            </button>
                          </div>

                          <button
                            onClick={shareCall}
                            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full border border-white/35 transition-colors shadow-lg"
                          >
                            <Share2 size={18} className="mr-2" />
                            <span>Share Invite</span>
                          </button>
                        </div>
                      </div>
                    );
                  } else if (!hasVideoPlaying && !isVideoFrozen) {
                    return (
                      // Have remote videos but they're not playing yet, show loading spinner
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="mt-4 text-gray-300 text-sm">
                            Connecting video stream...
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
                {/* Video is playing or frozen, don't show any overlay */}
              </div>
              {/* Video Status Overlay - Above video but below controls */}
              <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-gray-900/90 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {" "}
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-200">
                        Live
                      </span>
                    </div>
                    {isRecording && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-200">
                          Recording
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isVideoFrozen && isARHandActive && (
                <canvas
                  ref={combinedCanvasRef}
                  id="combinedCanvasFreezeOverlay"
                  className="absolute inset-0 z-10 w-full h-full"
                  style={{ objectFit: "cover", pointerEvents: "none" }}
                />
              )}
              <AnnotationComponent
                callId={callId}
                database={database}
                agoraEngine={agoraEngine.current}
                remoteVideos={remoteVideos}
                remoteVideoContainerRef={remoteVideoContainerRef}
                uidRef={uidRef}
                annotations={annotations}
                setAnnotations={setAnnotations}
                isVideoFrozen={isVideoFrozen}
                frozenFrameRef={isARHandActive && isVideoFrozen ? combinedCanvasRef : frozenFrameRef}
                frozenFrame={isARHandActive && isVideoFrozen ? null : frozenFrame}
                isRemoteVideoFrozen={isRemoteVideoFrozen}
              />
              {/* Frozen Frame Overlay */}
              {isVideoFrozen && !isARHandActive && (
                frozenFrame && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                    <img
                      src={frozenFrame}
                      alt="Frozen Frame"
                      className="w-full h-full object-cover"
                      style={{ pointerEvents: "none" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold bg-black/60 px-6 py-2 rounded-lg">
                        Video Frozen
                      </span>
                    </div>
                  </div>
                )
              )}
              {/* Remote video frozen due to connection issues */}
              {isRemoteVideoFrozen &&
                (() => {
                  return (
                    <div className="absolute inset-0 z-30 backdrop-blur-sm bg-black/40 flex items-center justify-center">
                      <div className="text-center px-6 py-4 rounded-lg bg-gray-900/80 backdrop-blur-lg border border-gray-700">
                        <VideoOff
                          size={32}
                          className="mx-auto mb-2 text-yellow-500"
                        />
                        <p className="text-gray-200">
                          Video connection interrupted
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Attempting to reconnect...
                        </p>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      </div>
      {isARHandActive && (
        <canvas
          ref={combinedCanvasRef}
          id="combinedCanvas"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: "cover",
            zIndex: 10,
            pointerEvents: "none",
          }}
        />
      )}
      <video
        ref={secondCameraVideoRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
      {/* Fixed Control Panel - Above video content */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm p-4 flex justify-center space-x-4 z-40 border-t border-gray-700">
        {/* Control buttons */}
        <ControlPanel
          callId={callId}
          database={database}
          clientRef={clientRef}
          localAudioTrackRef={localAudioTrackRef}
          remoteVideoContainerRef={remoteVideoContainerRef}
          channelRef={channelRef}
          recordingRef={recordingRef}
          screenShareRef={screenShareRef}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          stopVideoState={stopVideoState}
          setStopVideoState={setStopVideoState}
          isVideoFrozen={isVideoFrozen}
          setIsVideoFrozen={setIsVideoFrozen}
          setFreezeOverlayVisible={setFreezeOverlayVisible}
          frozenFrame={frozenFrame}
          setFrozenFrame={setFrozenFrame}
          isScreenSharing={isScreenSharing}
          setIsScreenSharing={setIsScreenSharing}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          toggleChat={() => setIsChatOpen(!isChatOpen)}
          endCall={endCall}
          setARHandActive={setIsARHandActive}
          isARHandActive={isARHandActive}
          cursorActive={cursorActive}
          setCursorActive={setCursorActive}
        />
      </div>
      {/* Chat Panel - Highest z-index */}
      {isChatOpen && (
        <div className="fixed right-0 top-[60px] bottom-[76px] w-80 bg-gray-800 shadow-xl z-50">
          <ChatPanel
            callId={callId}
            database={database}
            userId={auth.currentUser?.uid || uid || "anonymous"}
            userName={
              auth.currentUser?.displayName ||
              `${uid?.substring(0, 20) || "Anonymous"}`
            }
            onCloseChat={handleCloseChat}
          />
        </div>
      )}{" "}
      {/* Invite User Button - High z-index */}
      <div
        className="fixed top-4 right-4 z-50 flex items-center bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer font-bold shadow-lg gap-2 md:top-6 md:right-6 md:px-6 md:py-3 md:text-base sm:top-2 sm:right-2 sm:px-2 sm:py-1 sm:text-xs"
        style={{
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        }}
        onClick={() => {
          console.log("Invite button clicked");
          setShowInviteDialog(true);
          fetchAvailableUsers();
        }}
      >
        <UserPlus size={20} className="sm:w-4 sm:h-4 md:w-6 md:h-6" />
        <span className="hidden sm:inline">Add User</span>
      </div>
      {/* Invite Dialog - Highest z-index */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                Invite Users to Call
              </h2>
              <button
                onClick={() => setShowInviteDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {inviteLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            ) : (
              <>
                {availableUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <UserX size={48} className="mx-auto mb-2" />
                    <p>No contacts available to invite</p>
                    <button
                      onClick={fetchAvailableUsers}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw size={16} className="inline mr-2" />
                      Refresh Contacts
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto my-4 space-y-2">
                    {availableUsers
                      .filter(
                        (user) =>
                          typeof user === "string" &&
                          user.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((licenseId) => (
                        <div
                          key={licenseId}
                          className={`flex items-center p-3 rounded-md cursor-pointer transition-colors bg-gray-700 hover:bg-gray-600 ${
                            selectedUsersToInvite.includes(licenseId)
                              ? "bg-blue-600"
                              : ""
                          }`}
                          onClick={() => toggleUserSelection(licenseId)}
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                            {licenseId.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{licenseId}</p>
                            {/* <div className="text-sm text-gray-400 flex items-center">
                              <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                              <span>Online</span>
                            </div> */}
                          </div>
                          {selectedUsersToInvite.includes(licenseId) && (
                            <Check size={20} className="ml-2 text-white" />
                          )}
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setShowInviteDialog(false)}
                    className="px-4 py-2 text-gray-300 mr-2 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvitations}
                    disabled={selectedUsersToInvite.length === 0}
                    className={`px-4 py-2 rounded-md ${
                      selectedUsersToInvite.length === 0
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    Invite Selected ({selectedUsersToInvite.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Waiting Room Dialog */}
      {showWaitingRoomDialog &&
        waitingUsers.length > 0 &&
        userRole === "host" && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[55]">
            <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-full max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Users size={20} className="text-blue-400 mr-2" />
                  Waiting Room
                  <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {waitingUsers.length}
                  </span>
                </h2>
                <button
                  onClick={() => setShowWaitingRoomDialog(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <WaitingRoom
                  waitingUsers={waitingUsers}
                  admitUser={admitUser}
                  denyUser={denyUser}
                  admitAll={admitAll}
                  denyAll={denyAll}
                />
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={waitingRoomEnabled}
                    onChange={(e) => toggleWaitingRoom(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600 border-gray-600 bg-gray-700 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <span className="ml-2 text-sm text-gray-300">
                    Enable waiting room
                  </span>
                </label>

                <button
                  onClick={() => setShowWaitingRoomDialog(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Participant Panel */}
      {showParticipantPanel && (
        <div className="fixed right-0 top-[60px] bottom-[76px] z-50 flex items-start justify-end p-4">
          <ParticipantPanel
            participants={participants}
            localUser={{ uid: uid }}
            userRole={userRole}
            onToggleMute={toggleMuteParticipant}
            onToggleVideo={toggleVideoParticipant}
            onToggleSpotlight={toggleSpotlight}
            onTogglePin={toggleUserPin}
            onPromoteUser={(userId) => updateUserRole(userId, "host")}
            onDemoteUser={(userId) => updateUserRole(userId, "participant")}
            onRemoveUser={removeParticipant}
            onSendDirectMessage={sendDirectMessage}
            raisedHands={raisedHands}
            onLowerHand={lowerParticipantHand}
            onClose={() => setShowParticipantPanel(false)}
          />
        </div>
      )}
      {/* Waiting Room Notification Badge */}
      {userRole === "host" && waitingRoomEnabled && waitingUsers.length > 0 && (
        <div
          className="fixed top-20 right-4 z-50 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg cursor-pointer flex items-center animate-pulse"
          onClick={() => setShowWaitingRoomDialog(true)}
        >
          <Users size={18} className="mr-2" />
          <span className="font-medium">{waitingUsers.length} waiting</span>
        </div>
      )}
      {/* Show VideoCallTitleDialog at end of call */}
      {showTitleDialog && (
        <VideoCallTitleDialog
          isOpen={showTitleDialog}
          onSubmit={handleTitleDialogSubmit}
          onClose={handleTitleDialogClose}
        />
      )}
    </div>
  );
};

export default VideoCallingWithARHand;
