// import React, { useEffect, useRef, useState } from 'react';
// import { createRoot } from 'react-dom/client';
// import { ref, push, set, get, onValue, update, remove } from 'firebase/database';
// import { database } from '../../firebaseConfig';
// import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import './VideoCall.css';
// import AgoraRTC from 'agora-rtc-sdk-ng';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// // const { ipcRenderer } = window.require('electron');

// const VideoCall = ({ onCallEnd }) => {
//     // const [callId, setCallId] = useState('');
//     const [messages, setMessages] = useState([]);
//     const [messageInput, setMessageInput] = useState("");
//     const [isChatOpen, setIsChatOpen] = useState(false);
//     const [error, setError] = useState("");
//     const [isMuted, setIsMuted] = useState(false);
//     const [isVideoEnabled, setIsVideoEnabled] = useState(true);
//     const [isVideoFrozen, setIsVideoFrozen] = useState(false);
//     const [isScreenSharing, setIsScreenSharing] = useState(false);
//     const [isDrawing, setIsDrawing] = useState(false);
//     const [isRecording, setIsRecording] = useState(false);
//     const [User, setUser] = useState(null);
//     const [frozenFrame, setFrozenFrame] = useState(null);

//     // Refs for video and client management
//     const clientRef = useRef(null);
//     const localVideoTrackRef = useRef(null);
//     const localAudioTrackRef = useRef(null);
//     const remoteUsersRef = useRef({});
//     const remoteVideoContainerRef = useRef(null);
//     const recordingRef = useRef(null);
//     const remoteVideoRefs = useRef({});
//     const [channelId, setChannelId] = useState('');
//     const videoRef = useRef(null);
//     const channelRef = useRef(null); // Added missing channelRef

//     // Canvas and drawing refs
//     const annotationCanvasRef = useRef(null);
//     const drawingDataRef = useRef([]);
//     const freezeCanvasRef = useRef(null); // Add this for freeze functionality
//     const [videoCalls, setVideoCalls] = useState([]);
//     const [isLibraryOpen, setIsLibraryOpen] = useState(false);
//     // Agora configuration
//     const APP_ID = "4b1cd332c9004cda9b6f3b70e3b685e6";
//     const TOKEN = null;

//     const canvasRef = useRef(null);

//     const clientInitialized = useRef(false);
//     const client = useRef(null); // Reference to Agora client
//     const localVideoRef = useRef(null);  // Local video feed reference
//     // Remote user video feed references
//     const [activeUsers, setActiveUsers] = useState([]);  // List of active users in the call
//     const [stopVideoState, setStopVideoState] = useState(null);
//     const storage = getStorage();

//     const [searchParams] = useSearchParams();
//     const callId = searchParams.get('callId');
//     const uid = searchParams.get('uid');

//     const [remoteVideos, setRemoteVideos] = useState({});

//     const navigate = useNavigate();

//     useEffect(() => {
//         // Set the channel reference when channelId changes
//         if (channelId) {
//             channelRef.current = ref(database, `videoCalls/${channelId}`);
//         }
//     }, [channelId]);

//     useEffect(() => {
//         if (callId) {
//           console.log("Joining call with callId:", callId, "and uid:", uid);
//           setChannelId(callId);
//           joinAgoraCall(callId);
//         }
//       }, [callId, uid]);

//     // Add a useEffect to listen for freeze changes in Firebase
//     useEffect(() => {
//         if (channelId) {
//             const freezeRef = ref(database, `videoCalls/${channelId}/freeze`);
//             const unsubscribe = onValue(freezeRef, (snapshot) => {
//                 if (snapshot.exists()) {
//                     const freezeState = snapshot.val();
//                     setIsVideoFrozen(freezeState === 'on');
//                     // If freeze is turned on and we don't have a frozen frame yet, capture one
//                     if (freezeState === 'on' && !frozenFrame) {
//                         captureVideoFrame();
//                     }
//                 }
//             });
//             return () => unsubscribe();
//         }
//     }, [channelId, frozenFrame]);

//     const joinAgoraCall = async (channelId) => {
//         if (!channelId) {
//             console.error('Channel ID is not provided');
//             return;
//         }

//         if (clientInitialized.current) return;  // Avoid initializing the client multiple times

//         // Initialize Agora RTC client
//         clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
//         console.log('Agora client initialized.');

//         try {
//             // Join the Agora channel
//             await clientRef.current.join(APP_ID, channelId, TOKEN, null);
//             //console.log("Joined channel successfully with UID:", uid);

//             // Handle user publishing events
//             clientRef.current.on('user-published', async (user, mediaType) => {
//                 await handleUserPublished(user, mediaType);
//             });

//             // Handle user unpublishing events
//             clientRef.current.on('user-unpublished', (user, mediaType) => {
//                 handleUserUnpublished(user, mediaType);
//             });

//             // Handle user leaving events
//             clientRef.current.on('user-left', (user) => {
//                 handleUserLeft(user);
//             });

//             // Join channel and publish local tracks
//             await joinChannelAndPublishTracks();
//         } catch (error) {
//             console.error('Agora initialization error:', error);
//         }

//         // Initialize Firebase channel data if it doesn't exist
//         if (channelRef.current) {
//             get(channelRef.current).then(snapshot => {
//                 if (!snapshot.exists()) {
//                     set(channelRef.current, {
//                         freeze: 'off',
//                         annotations: 'active',
//                         frozenFrameUrl: null
//                     });
//                 }
//             });
//         }
//     };
//     useEffect(() => {
//         const stopVideoRef = ref(database, `videoCalls/${channelId}`);
//         get(stopVideoRef).then(snapshot => {
//             if (snapshot.exists()) {
//                 const currentStopVideoState = snapshot.val().stopVideo;
//                 setStopVideoState(currentStopVideoState); // Update local state
//             } else {
//                 // Initialize if not found
//                 setStopVideoState('stop');
//             }
//         }).catch(error => {
//             console.error('Error fetching stopVideo state from Firebase:', error);
//         });
//     }, [channelId]);



//     const handleStopVideo = () => {
//         const stopVideoRef = ref(database, `videoCalls/${channelId}`);

//         // Update stopVideo state in Firebase
//         get(stopVideoRef).then(snapshot => {
//             if (snapshot.exists()) {
//                 const currentStopVideoState = snapshot.val().stopVideo;

//                 // Toggle the stopVideo state
//                 if (currentStopVideoState === "stop") {
//                     update(stopVideoRef, { stopVideo: 'start' })
//                         .then(() => {
//                             console.log('Video started');
//                             setStopVideoState('start'); // Update local state to reflect the change
//                         })
//                         .catch(error => {
//                             console.error('Error starting video in Firebase:', error);
//                         });
//                 } else {
//                     update(stopVideoRef, { stopVideo: 'stop' })
//                         .then(() => {
//                             console.log('Video stopped');
//                             setStopVideoState('stop'); // Update local state to reflect the change
//                         })
//                         .catch(error => {
//                             console.error('Error stopping video in Firebase:', error);
//                         });
//                 }
//             } else {
//                 // If stopVideo field doesn't exist, initialize to 'stop'
//                 update(stopVideoRef, { stopVideo: 'stop' })
//                     .then(() => {
//                         console.log('stopVideo field was missing, set to "stop" in Firebase');
//                         setStopVideoState('stop'); // Set local state to 'stop'
//                     })
//                     .catch(error => {
//                         console.error('Error initializing stopVideo in Firebase:', error);
//                     });
//             }
//         }).catch(error => {
//             console.error('Error reading from Firebase:', error);
//         });
//     };
    
//     const handleUserPublished = async (user, mediaType) => {
//         try {
//             // Subscribe to the user for the required media type
//             await clientRef.current.subscribe(user, mediaType);
    
//             // Handle video track
//             if (mediaType === 'video') {
//                 // If the video is frozen, pause the remote video playback
//                 if (isVideoFrozen) {
//                     user.videoTrack.pause();  // Pause the video track instead of stopping it
//                 }
    
//                 // Check if the video element exists; if not, create it
//                 const videoElement = document.getElementById(`remote-video-${user.uid}`);
//                 if (!videoElement) {
//                     // Create a new video element dynamically
//                     const newVideoElement = document.createElement('video');
//                     newVideoElement.id = `remote-video-${user.uid}`;
//                     newVideoElement.autoplay = true;
//                     newVideoElement.playsInline = true;
//                     remoteVideoContainerRef.current.appendChild(newVideoElement); // Append to the container
//                 }
    
//                 // Now, play the video track in the correct element
//                 user.videoTrack.play(`remote-video-${user.uid}`);
                
//                 // Update state with the remote video track
//                 setRemoteVideos((prev) => ({
//                     ...prev,
//                     [user.uid]: user.videoTrack,
//                 }));
//             }
    
//             // Handle audio track
//             if (mediaType === 'audio') {
//                 user.audioTrack.play();
//             }
//         } catch (error) {
//             console.error('Error subscribing to user:', error);
//         }
//     };

//     // Handle user unpublished event
//     const handleUserUnpublished = (user, mediaType) => {
//         if (mediaType === 'video') {
//             const remoteUser = remoteVideoRefs.current[user.uid];
//             if (remoteUser) {
//                 remoteUser.remove();
//                 delete remoteVideoRefs.current[user.uid];
//             }
//         }
//     };

//     // Handle user left event
//     const handleUserLeft = (user) => {
//         const remoteUser = remoteVideoRefs.current[user.uid];
//         if (remoteUser) {
//             remoteUser.remove();
//             delete remoteVideoRefs.current[user.uid];
//         }
//     };

//     // Join channel and publish local tracks (audio and video)
//     const joinChannelAndPublishTracks = async () => {
//         try {
//             // Create and publish only the local audio track
//             localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
//             await clientRef.current.publish([localAudioTrackRef.current]);
//             console.log("AUDIO PUBLISHED SUCCESSFULLY");
//         } catch (error) {
//             console.error('ERROR JOINING CHANNEL:', error);
//         }
//     };

//     // New function to capture video frame
//     const captureVideoFrame = () => {
//         // Ensure we have a valid video element to capture
//         const videoElement = document.getElementById(`remote-video-${Object.keys(remoteVideos)[0]}`);
    
//         if (!videoElement) {
//             console.error('No valid video element found to capture');
//             return;
//         }
    
//         // Create a canvas to capture the frame
//         const canvas = document.createElement('canvas');
//         canvas.width = videoElement.videoWidth;  // Get the width of the video element
//         canvas.height = videoElement.videoHeight;  // Get the height of the video element
//         const ctx = canvas.getContext('2d');
    
//         // Capture the current frame from the video element
//         ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
//         // Convert the frame to a data URL and store it
//         const frameDataUrl = canvas.toDataURL('image/png');
//         setFrozenFrame(frameDataUrl); // Save the frame for later use
    
//         // Store the frozen frame in Firebase for other users
//         if (channelRef.current) {
//             update(channelRef.current, {
//                 frozenFrameUrl: frameDataUrl
//             });
//         }
//     };
    
    

//     // Message handling functions
//     const handleSendMessage = async () => {
//         if (messageInput.trim()) {
//             try {
//                 const newMessageRef = push(ref(database, `videoCalls/${channelId}/messages`));
//                 await set(newMessageRef, {
//                     text: messageInput,
//                     user: 'You',
//                     timestamp: new Date().toISOString(),
//                 });
//                 setMessageInput('');
//             } catch (err) {
//                 console.error('Error sending message:', err);
//                 setError('Failed to send message.');
//             }
//         }
//     };

//     // Screen sharing toggle
//     const toggleScreenSharing = async () => {
//         try {
//             if (!isScreenSharing) {
//                 const screenTrack = await AgoraRTC.createScreenVideoTrack();
//                 await clientRef.current.publish(screenTrack);
//                 setIsScreenSharing(true);
//             } else {
//                 const tracks = clientRef.current.localTracks;
//                 tracks.forEach(track => {
//                     if (track.getTrackLabel().includes('screen')) {
//                         clientRef.current.unpublish(track);
//                         track.close();
//                     }
//                 });
//                 setIsScreenSharing(false);
//             }
//         } catch (error) {
//             console.error('Screen sharing error:', error);
//             setError('Failed to toggle screen sharing');
//         }
//     };

//     // Toggle Mute Function
//     const toggleMute = () => {
//         if (localAudioTrackRef.current) {
//             setIsMuted(!isMuted);
//             localAudioTrackRef.current.setEnabled(!isMuted);
//         }
//     };

//     // Toggle Video Function
//     const toggleVideo = () => {
//         if (localVideoTrackRef.current) {
//             setIsVideoEnabled(!isVideoEnabled);
//             localVideoTrackRef.current.setEnabled(!isVideoEnabled);
//         }
//     };

//     // Clear Annotations Function
//     const clearAnnotations = () => {
//         const canvas = annotationCanvasRef.current;
//         if (canvas) {
//             const context = canvas.getContext('2d');
//             context.clearRect(0, 0, canvas.width, canvas.height);
//             drawingDataRef.current = [];
//         }
//     };

//     // Start Recording Function
//     const startRecording = () => {
//         // Get the first remote video stream (or choose a specific one)
//         const remoteVideo = Object.values(remoteVideoRefs.current)[0];
//         if (!remoteVideo || !remoteVideo.srcObject) {
//             console.error('No remote video stream found');
//             return;
//         }
//         // Get the remote video stream
//         const remoteStream = remoteVideo.srcObject;
//         // Create a MediaRecorder instance
//         const mediaRecorder = new MediaRecorder(remoteStream, {
//             mimeType: 'video/webm; codecs=vp9',
//         });
//         // Store recorded chunks
//         const chunks = [];
//         mediaRecorder.ondataavailable = (event) => {
//             if (event.data.size > 0) {
//                 chunks.push(event.data);
//             }
//         };
//         // Handle recording stop
//         mediaRecorder.onstop = () => {
//             // Combine chunks into a Blob
//             const blob = new Blob(chunks, { type: 'video/webm' });
//             // Convert Blob to base64
//             const reader = new FileReader();
//             reader.readAsDataURL(blob);
//             reader.onloadend = () => {
//                 const base64data = reader.result;
//                 // Save the recording to Firebase
//                 const recordingRef = ref(database, `videoCalls/${channelId}/captures/${Date.now()}`);
//                 set(recordingRef, {
//                     videoUrl: base64data,

//                     timestamp: new Date().toISOString(),
//                 }).then(() => {
//                     console.log('Recording saved to Firebase');
//                 }).catch((error) => {
//                     console.error('Error saving recording to Firebase:', error);
//                 });
//             };
//         };
//         // Start recording
//         mediaRecorder.start();
//         setIsRecording(true);
//         recordingRef.current = mediaRecorder; // Store the MediaRecorder instance
//     };

//     // Stop Recording Function
//     const stopRecording = () => {
//         if (recordingRef.current) {
//             recordingRef.current.stop(); // Stop the MediaRecorder
//             setIsRecording(false);
//             recordingRef.current = null; // Clear the ref
//         }
//     };

//     // Download Recording Function
//     const downloadRecording = (blob) => {
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `recording-${Date.now()}.webm`;
//         link.click();
//         URL.revokeObjectURL(url); // Clean up
//     };

//     const captureImage = () => {
//         // Get the first remote video element (or choose a specific one)
//         const remoteVideo = document.getElementById(`remote-video-${Object.keys(remoteVideos)[0]}`);
//         if (!remoteVideo) {
//             console.error('No remote video found');
//             return;
//         }
//         // Create a canvas to capture the remote video frame
//         const canvas = document.createElement('canvas');
//         canvas.width = remoteVideo.videoWidth;
//         canvas.height = remoteVideo.videoHeight;
//         const ctx = canvas.getContext('2d');
//         // Draw the remote video frame onto the canvas
//         ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
//         // Convert the canvas to a base64 image
//         const image = canvas.toDataURL('image/png');
//         // Save the image to Firebase Realtime Database
//         const imageRef = ref(database, `videoCalls/${channelId}/captures/${Date.now()}`);
//         set(imageRef, {
//             imageUrl: image,
//             timestamp: new Date().toISOString()
//         }).then(() => {
//             console.log('Remote image saved to Firebase');
//         }).catch((error) => {
//             console.error('Error saving remote image to Firebase:', error);
//         });
//         // Optionally, download the image locally
//         const link = document.createElement('a');
//         link.href = image;
//         link.download = 'remote-screenshot.png';
//         link.click();
//     };

//     const handleZoomIn = () => {
//         const zoomRef = ref(database, `videoCalls/${channelId}`); // Reference to the specific channel in videoCalls

//         // Fetch the current value of the zoom field in Firebase
//         get(zoomRef).then(snapshot => {
//             if (snapshot.exists()) {
//                 // If the zoom field exists, update it to 'zoomin'
//                 update(zoomRef, { zoom: 'zoomin' })
//                     .then(() => {
//                         console.log('Zoom in action sent to Firebase');
//                     })
//                     .catch(error => {
//                         console.error('Error updating zoom in Firebase:', error);
//                     });
//             } else {
//                 // If the zoom field doesn't exist, initialize it to 'zoomout' first
//                 update(zoomRef, { zoom: 'zoomin' })
//                     .then(() => {
//                         console.log('Zoom in action sent to Firebase');
//                     })
//                     .catch(error => {
//                         console.error('Error updating zoom in Firebase:', error);
//                     });
//             }
//         }).catch(error => {
//             console.error('Error reading from Firebase: ', error);
//         });
//     };

//     const handleZoomOut = () => {
//         const zoomRef = ref(database, `videoCalls/${channelId}`); // Reference to the specific channel in videoCalls

//         // Fetch the current value of the zoom field in Firebase
//         get(zoomRef).then(snapshot => {
//             if (snapshot.exists()) {
//                 // If the zoom field exists, update it to 'zoomout'
//                 update(zoomRef, { zoom: 'zoomout' })
//                     .then(() => {
//                         console.log('Zoom out action sent to Firebase');
//                     })
//                     .catch(error => {
//                         console.error('Error updating zoom in Firebase:', error);
//                     });
//             } else {
//                 // If the zoom field doesn't exist, initialize it to 'zoomout'
//                 update(zoomRef, { zoom: 'zoomout' })
//                     .then(() => {
//                         console.log('Zoom out action sent to Firebase');
//                     })
//                     .catch(error => {
//                         console.error('Error updating zoom in Firebase:', error);
//                     });
//             }
//         }).catch(error => {
//             console.error('Error reading from Firebase: ', error);
//         });
//     };

//     const freezeVideo = () => {
//         const freezeRef = ref(database, `videoCalls/${channelId}`);
        
//         // Fetch the current freeze state from Firebase
//         get(freezeRef).then(snapshot => {
//             if (snapshot.exists()) {
//                 const currentFreezeState = snapshot.val().freeze;
//                 if (currentFreezeState === "off") {
//                     // Capture the current frame before updating Firebase
//                     captureVideoFrame();
//                     update(freezeRef, { freeze: 'on' });  // Update Firebase state to 'on'
//                     setIsVideoFrozen(true);  // Update local state
//                     console.log('Freeze On action sent to Firebase');
//                 } else {
//                     update(freezeRef, { freeze: 'off' });  // Update Firebase state to 'off'
//                     setIsVideoFrozen(false);  // Update local state
//                     setFrozenFrame(null);  // Clear frozen frame
//                     console.log('Freeze Off action sent to Firebase');
//                 }
//             } else {
//                 // If the freeze field doesn't exist, initialize it to 'off'
//                 update(freezeRef, { freeze: 'off' });
//                 setIsVideoFrozen(false);  // Update local state
//                 console.log('Freeze field was missing, set to "off" in Firebase');
//             }
//         }).catch(error => {
//             console.error('Error reading from Firebase: ', error);
//         });
//     };
       

//     // End call
//     const endCall = () => {
//         // if (onCallEnd) {
//         //     onCallEnd();
//         // }
//         // window.close();

//         navigate('/dashboard');
        
//     };

//     return (
//         <div className="video-call-container">
//             <div ref={remoteVideoContainerRef} className="remote-video-container">
//             {isVideoFrozen && frozenFrame ? (
//                     <div className="frozen-frame-container">
//                         <img
//                             src={frozenFrame}
//                             alt="Frozen video frame"
//                             className="frozen-frame"
//                         />
//                         <div className="frozen-indicator">Video Frozen</div>
//                     </div>
//         ) : (
//             // If not frozen, display the remote video stream
//             Object.keys(remoteVideos).map(uid => (
//                 <video
//                     key={uid}
//                     id={`remote-video-${uid}`}
//                     autoPlay
//                     playsInline
//                     className="remote-video"
//                 />
//             ))
//         )}

//             </div>

//             {/* Local video preview (hidden when frozen) */}
//             <div className={`local-video-container ${isVideoFrozen ? 'hidden' : ''}`}>
//                 <video
//                     ref={localVideoRef}
//                     autoPlay
//                     playsInline
//                     muted
//                     className="local-video"
//                 />
//             </div>

//             <div className="controls-container">
//                 <button onClick={toggleMute} className="control-btn">
//                     {isMuted ? (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                             <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
//                         </svg>
//                     ) : (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                             <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
//                         </svg>
//                     )}
//                     <span>{isMuted ? 'Unmute' : 'Mute'}</span>
//                 </button>

//                 <button onClick={handleStopVideo} className="control-btn">
//                     {stopVideoState === 'stop' ? (
//                         <>
//                             <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                                 <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
//                             </svg>
//                             <span>Turn On Camera</span>
//                         </>
//                     ) : (
//                         <>
//                             <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                                 <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM10 15l-3-3v2H5v2h2v2l3-3zm4 0l3-3v2h2v2h-2v2l-3-3z" />
//                             </svg>
//                             <span>Turn Off Camera</span>
//                         </>
//                     )}
//                 </button>

//                 <button onClick={freezeVideo} className="control-btn">
//                     {isVideoFrozen ? (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
//                             <line x1="12" y1="8" x2="12" y2="16"/>
//                             <line x1="8" y1="12" x2="16" y2="12"/>
//                         </svg>
//                     ) : (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
//                         <line x1="12" y1="8" x2="12" y2="16"/>
//                         <line x1="8" y1="12" x2="16" y2="12"/>
//                     </svg>
//                     )}
//                     <span>{isVideoFrozen ? 'Unfreeze' : 'Freeze'}</span>
//                 </button>
//                 <button className='control-btn' onClick={handleZoomIn}>
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <circle cx="12" cy="12" r="10"/>
//                         <line x1="12" y1="8" x2="12" y2="16"/>
//                         <line x1="8" y1="12" x2="16" y2="12"/>
//                     </svg>
//                 <span>Zoom In</span></button>
//                 <button className='control-btn' onClick={handleZoomOut}>
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <circle cx="12" cy="12" r="10"/>
//                         <line x1="8" y1="12" x2="16" y2="12"/>
//                     </svg>
//                 <span>Zoom Out</span></button>
//                 <button onClick={toggleScreenSharing} className="control-btn">
//                     {isScreenSharing ? (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                             <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
//                             <line x1="8" y1="21" x2="16" y2="21"/>
//                             <line x1="12" y1="17" x2="12" y2="21"/>
//                         </svg>
//                     ) : (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                             <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
//                             <line x1="8" y1="21" x2="16" y2="21"/>
//                             <line x1="12" y1="17" x2="12" y2="21"/>
//                         </svg>
//                     )}
//                     <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
//                 </button>

//                 <button onClick={() => setIsChatOpen(!isChatOpen)} className="control-btn">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                         <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H4V5h16v11z" />
//                     </svg>
//                     <span>Chat</span>
//                 </button>

//                 <button onClick={() => setIsDrawing(!isDrawing)} className="control-btn">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                         <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
//                     </svg>
//                     <span>{isDrawing ? 'Stop Annotation' : 'Annotate'}</span>
//                 </button>

//                 <button onClick={clearAnnotations} className="control-btn">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                         <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
//                     </svg>
//                     <span>Clear Annotations</span>
//                 </button>

//                 <button onClick={isRecording ? stopRecording : startRecording} className="control-btn">
//                     {isRecording ? (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
//                         </svg>
//                     ) : (
//                         <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
//                             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2V8h-2v8z" />
//                         </svg>
//                     )}
//                     <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
//                 </button>

//                 <button onClick={captureImage} className="control-btn">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <circle cx="12" cy="12" r="10"/>
//                         <circle cx="12" cy="12" r="4"/>
//                         <line x1="21.17" y1="8" x2="12" y2="8"/>
//                     </svg>
//                     <span>Take Photo</span>
//                 </button>


//                 <button onClick={endCall} className="control-btn end-call-btn">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
//                     </svg>
//                     <span>End Call</span>
//                 </button>
//             </div>

//             {/* Chatbox */}
//             {isChatOpen && (
//                 <div className="chatbox">
//                     <div className="chatbox-messages">
//                         {messages.map((msg, index) => (
//                             <div key={index} className={`message ${msg.user === 'You' ? 'sent' : 'received'}`}>
//                                 <strong>{msg.user}:</strong> {msg.text}
//                             </div>
//                         ))}
//                     </div>
//                     <div className="chatbox-input">
//                         <input
//                             type="text"
//                             value={messageInput}
//                             onChange={(e) => setMessageInput(e.target.value)}
//                             onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
//                             placeholder="Type a message..."
//                         />
//                         <button onClick={handleSendMessage}>Send</button>
//                     </div>
//                 </div>
//             )}

//             {/* Hidden Canvas for Freeze */}
//             <canvas ref={annotationCanvasRef} style={{ display: 'none' }} />
//         </div>
//     );
// };

// export default VideoCall;

// const rootElement = document.getElementById('video-root');
// if (rootElement) {
//     const root = createRoot(rootElement); // Use createRoot
//     root.render(<VideoCall />); // Render the app
// } else {
//     console.error('ERROR: No video-root element found!');
// }







// import React, { useEffect, useState, useRef } from 'react';
// import { ref, push, set, get, update, onValue } from 'firebase/database';
// import { database } from '../../firebaseConfig';
// import AgoraRTC from 'agora-rtc-sdk-ng';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { 
//   Mic, MicOff, Video, VideoOff, Pause, Play, 
//   ZoomIn, ZoomOut, Share2, StopCircle, 
//   MessageSquare, Camera, Circle, Phone,
//   Clock, Copy, CheckCircle 
// } from 'lucide-react';

// const VideoCall = ({ onCallEnd }) => {
//   const [messages, setMessages] = useState([]);
//   const [messageInput, setMessageInput] = useState('');
//   const [isChatOpen, setIsChatOpen] = useState(false);
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoFrozen, setIsVideoFrozen] = useState(false);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const [frozenFrame, setFrozenFrame] = useState(null);
//   const [stopVideoState, setStopVideoState] = useState(null);
//   const [callDuration, setCallDuration] = useState(0);
//   const [copied, setCopied] = useState(false);
//   const [callPurpose, setCallPurpose] = useState('Remote Consultation');
//   const [annotations, setAnnotations] = useState({});
  
//   const clientRef = useRef(null);
//   const localAudioTrackRef = useRef(null);
//   const remoteVideoContainerRef = useRef(null);
//   const canvasRef = useRef(null);
//   const recordingRef = useRef(null);
//   const channelRef = useRef(null);
//   const timerRef = useRef(null);
  
//   const [searchParams] = useSearchParams();
//   const callId = searchParams.get('callId');
//   const uid = searchParams.get('uid');
  
//   const APP_ID = "15ae49b078f44fed91592a4b7114d81e";
//   const TOKEN = null;

//   const navigate = useNavigate();

//   useEffect(() => {
//     if (callId) {
//       channelRef.current = ref(database, `videoCalls/${callId}`);
//       joinAgoraCall(callId);
      
//       timerRef.current = setInterval(() => {
//         setCallDuration(prev => prev + 1);
//       }, 1000);
      
//       const unsubscribeAnnotations = onValue(ref(database, `videoCalls/${callId}/annotations`), (snapshot) => {
//         if (snapshot.exists()) {
//           setAnnotations(snapshot.val());
//         }
//       });

//       return () => {
//         clearInterval(timerRef.current);
//         unsubscribeAnnotations();
//       };
//     }
//   }, [callId]);

//   const joinAgoraCall = async (channelId) => {
//     if (!channelId) return;
    
//     clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
//     try {
//       await clientRef.current.join(APP_ID, channelId, TOKEN, null);
//       await joinChannelAndPublishTracks();
//     } catch (error) {
//       console.error('Agora initialization error:', error);
//     }
//   };

//   const joinChannelAndPublishTracks = async () => {
//     try {
//       localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
//       await clientRef.current.publish([localAudioTrackRef.current]);
//     } catch (error) {
//       console.error('Error joining channel:', error);
//     }
//   };

//   const handleSendMessage = async () => {
//     if (messageInput.trim()) {
//       const newMessageRef = push(ref(database, `videoCalls/${callId}/messages`));
//       await set(newMessageRef, {
//         text: messageInput,
//         user: 'You',
//         timestamp: new Date().toISOString(),
//       });
//       setMessageInput('');
//     }
//   };

//   const handleCopyRoomId = () => {
//     navigator.clipboard.writeText(callId);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   const toggleChat = () => setIsChatOpen(!isChatOpen);

//   const endCall = () => {
//     navigate('/dashboard');
//     if (onCallEnd) onCallEnd();
//   };

//   return (
//     <div className="relative w-full h-screen bg-gray-900">
//       <div className="w-full bg-gray-800 py-3 px-4 flex items-center justify-between shadow-md fixed top-0 left-0 z-10">
//         <div className="flex items-center space-x-4">
//           <div className="flex flex-col">
//             <h1 className="text-xl font-semibold text-white">{callPurpose}</h1>
//             <div className="flex items-center text-gray-300 text-sm mt-1">
//               <Clock size={16} className="mr-1" />
//               <span>{new Date(callDuration * 1000).toISOString().substr(14, 5)}</span>
//             </div>
//           </div>
//         </div>
        
//         <div className="flex items-center space-x-4">
//           <div className="flex items-center bg-gray-700 px-3 py-1 rounded-md">
//             <span className="text-gray-300 mr-2 text-sm font-medium">Room ID: </span>
//             <span className="text-blue-400 font-mono">{callId}</span>
//             <button onClick={handleCopyRoomId} className="ml-2 text-gray-400 hover:text-white transition-colors">
//               {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
//             </button>
//           </div>

//           <button onClick={() => setIsChatOpen(!isChatOpen)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors">
//             <MessageSquare size={16} className="mr-1" />
//             <span>Chat</span>
//           </button>
//         </div>
//       </div>

//       <div className="flex items-center justify-center w-full h-full pt-16 pb-16">
//         <div className="relative w-[800px] h-[500px] overflow-hidden rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 p-1">
//           <div className="relative w-[790px] h-[480px] rounded-lg bg-gray-800 overflow-hidden">
//             <div ref={remoteVideoContainerRef} className="absolute inset-0 flex items-center justify-center bg-black">
//               {/* Display remote videos */}
//             </div>

//             <canvas ref={canvasRef} className="absolute z-30" style={{ display: 'block' }} />
//           </div>
//         </div>
//       </div>

//       <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 z-20">
//         {/* Control Buttons */}
//         <button onClick={toggleChat} className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 transition">
//           <MicOff size={24} />
//           <span className="text-xs mt-1">Mute</span>
//         </button>

//         <button onClick={endCall} className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 transition">
//           <Phone size={24} />
//           <span className="text-xs mt-1">End Call</span>
//         </button>
//       </div>

//       {/* Chat Panel */}
//       {isChatOpen && (
//         <div className="fixed top-0 right-0 bottom-0 w-1/3 bg-gray-800 z-30">
//           <div className="flex justify-between items-center p-4 bg-gray-600">
//             <span className="text-white">Chat</span>
//             <button onClick={() => setIsChatOpen(false)} className="text-white">
//               <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                 <path d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//           <div className="p-4 overflow-y-auto h-72">
//             {messages.map((msg, index) => (
//               <div key={index} className={`mb-2 p-3 rounded-xl max-w-xs ${msg.user === 'You' ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-600 text-white'}`}>
//                 <div className="text-sm font-semibold">{msg.user}</div>
//                 <div>{msg.text}</div>
//               </div>
//             ))}
//           </div>
//           <div className="flex p-4">
//             <input
//               type="text"
//               value={messageInput}
//               onChange={(e) => setMessageInput(e.target.value)}
//               onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
//               placeholder="Type a message..."
//               className="flex-1 p-2 bg-gray-700 text-white"
//             />
//             <button onClick={handleSendMessage} className="p-2 bg-blue-600 text-white rounded-l">Send</button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default VideoCall;
