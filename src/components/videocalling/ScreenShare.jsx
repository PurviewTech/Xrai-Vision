import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const ScreenShare = forwardRef(({
  clientRef,
  isScreenSharing,
  setIsScreenSharing,
  setRemoteVideos,
  remoteVideoContainerRef,
  localVideoTrackRef
}, ref) => {
  const screenTrackRef = useRef(null);
  const originalVideoTrackRef = useRef(null);

  const startScreenShare = async () => {
    try {
      if (!clientRef.current) {
        console.error('Agora client not initialized');
        return;
      }

      // Store the original video track if it exists
      if (localVideoTrackRef.current) {
        originalVideoTrackRef.current = localVideoTrackRef.current;
        // Unpublish the original video track
        await clientRef.current.unpublish(localVideoTrackRef.current);
      }

      // Create screen track with specific configurations
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1920,
          height: 1080,
          frameRate: 30,
          bitrateMin: 1000,
          bitrateMax: 3000,
        },
        optimizationMode: "detail"
      });
      
      screenTrackRef.current = screenTrack;

      // Create container for screen share if it doesn't exist
      let screenContainer = document.getElementById('screen-share-container');
      if (!screenContainer) {
        screenContainer = document.createElement('div');
        screenContainer.id = 'screen-share-container';
        screenContainer.className = 'screen-share-container';
        // Ensure we have a container to append to
        if (!remoteVideoContainerRef.current) {
          const container = document.createElement('div');
          container.id = 'remote-video-container';
          container.className = 'remote-video-container';
          document.body.appendChild(container);
          remoteVideoContainerRef.current = container;
        }
        remoteVideoContainerRef.current.appendChild(screenContainer);
      }

      // Add screen-sharing-active class to parent container
      remoteVideoContainerRef.current.classList.add('screen-sharing-active');

      // Play screen track in container first
      await screenTrack.play(screenContainer);
      console.log('Screen track playing successfully');

      // Publish screen track after successful play
      await clientRef.current.publish(screenTrack);
      console.log('Screen sharing track published successfully');

      // Add to remoteVideos after successful publish
      setRemoteVideos(prev => ({
        ...prev,
        'screen': screenTrack
      }));
      
      setIsScreenSharing(true);

      // Add event listeners for screen track
      screenTrack.on('track-ended', () => {
        console.log('Screen sharing ended by user');
        stopScreenShare();
      });

      screenTrack.on('track-error', (error) => {
        console.error('Screen sharing error:', error);
        stopScreenShare();
      });

    } catch (error) {
      console.error('Error starting screen share:', error);
      setIsScreenSharing(false);
      // Clean up on error
      if (screenTrackRef.current) {
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      // Restore original video track if it exists
      if (originalVideoTrackRef.current) {
        await clientRef.current.publish(originalVideoTrackRef.current);
      }
    }
  };

  const stopScreenShare = async () => {
    try {
      if (screenTrackRef.current) {
        // Unpublish first
        await clientRef.current.unpublish(screenTrackRef.current);
        
        // Close the track
        screenTrackRef.current.close();
        screenTrackRef.current = null;

        // Remove from remoteVideos
        setRemoteVideos(prev => {
          const newVideos = { ...prev };
          delete newVideos['screen'];
          return newVideos;
        });

        // Remove screen share container
        const screenContainer = document.getElementById('screen-share-container');
        if (screenContainer) {
          screenContainer.remove();
        }

        // Remove screen-sharing-active class
        if (remoteVideoContainerRef.current) {
          remoteVideoContainerRef.current.classList.remove('screen-sharing-active');
        }

        // Restore original video track if it exists
        if (originalVideoTrackRef.current) {
          await clientRef.current.publish(originalVideoTrackRef.current);
          originalVideoTrackRef.current = null;
        }
      }
      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    startScreenShare,
    stopScreenShare
  }));

  useEffect(() => {
    return () => {
      if (screenTrackRef.current) {
        stopScreenShare();
      }
    };
  }, []);

  return null; // This is a functional component that doesn't render anything
});

export default ScreenShare; 