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

  // Start screen share feed
  const startScreenShare = async () => {
    try {
      if (!clientRef.current) {
        console.error('Agora client not initialized');
        return;
      }

      // Store the original video track if it exists
      if (localVideoTrackRef.current) {
        originalVideoTrackRef.current = localVideoTrackRef.current;
        await clientRef.current.unpublish(localVideoTrackRef.current);
      }

      // Create screen track
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

      // Create container for screen share
      let screenContainer = document.getElementById('screen-share-container');
      if (!screenContainer) {
        screenContainer = document.createElement('div');
        screenContainer.id = 'screen-share-container';
        screenContainer.className = 'screen-share-container';
        screenContainer.style.width = '100%';
        screenContainer.style.height = '100%';
        screenContainer.style.position = 'relative';
        screenContainer.style.zIndex = '1';
        
        if (!remoteVideoContainerRef.current) {
          const container = document.createElement('div');
          container.id = 'remote-video-container';
          container.className = 'remote-video-container';
          document.body.appendChild(container);
          remoteVideoContainerRef.current = container;
        }
        remoteVideoContainerRef.current.appendChild(screenContainer);
      }

      // Add screen-sharing-active class
      remoteVideoContainerRef.current.classList.add('screen-sharing-active');

      // Play screen track
      await screenTrack.play(screenContainer);
      console.log('Screen track playing successfully');

      // Publish screen track
      await clientRef.current.publish(screenTrack);
      console.log('Screen sharing track published successfully');

      // Add to remoteVideos state
      setRemoteVideos(prev => ({
        ...prev,
        'screen': screenTrack
      }));
      
      setIsScreenSharing(true);

      // Event listeners
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
      if (screenTrackRef.current) {
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      if (originalVideoTrackRef.current) {
        await clientRef.current.publish(originalVideoTrackRef.current);
      }
    }
  };

  // Stop screen share feed
  const stopScreenShare = async () => {
    try {
      if (screenTrackRef.current) {
        console.log('Stopping screen share - unpublishing track');
        
        // Ensure the track is unpublished
        try {
          await clientRef.current.unpublish(screenTrackRef.current);
          console.log('Successfully unpublished screen track');
        } catch (unpublishError) {
          console.error('Error unpublishing screen track:', unpublishError);
          // Continue with cleanup even if unpublishing fails
        }
        
        // Close the track to release resources
        try {
          screenTrackRef.current.close();
          console.log('Successfully closed screen track');
        } catch (closeError) {
          console.error('Error closing screen track:', closeError);
        }
        
        // Clear the reference
        screenTrackRef.current = null;

        // Update remote videos state
        setRemoteVideos(prev => {
          const newVideos = { ...prev };
          delete newVideos['screen'];
          return newVideos;
        });

        // Remove the container
        const screenContainer = document.getElementById('screen-share-container');
        if (screenContainer) {
          screenContainer.remove();
          console.log('Removed screen container');
        } else {
          console.log('Screen container not found for removal');
        }

        // Remove the active class
        if (remoteVideoContainerRef.current) {
          remoteVideoContainerRef.current.classList.remove('screen-sharing-active');
        }

        // Republish the original video track if it exists
        if (originalVideoTrackRef.current) {
          console.log('Republishing original video track');
          try {
            await clientRef.current.publish(originalVideoTrackRef.current);
            console.log('Successfully republished original video track');
          } catch (publishError) {
            console.error('Error republishing original video track:', publishError);
          }
          originalVideoTrackRef.current = null;
        } else {
          console.log('No original video track to republish');
        }
      } else {
        console.log('No screen track found to stop');
      }
      
      // Update state regardless of success/failure
      setIsScreenSharing(false);
      console.log('Screen sharing state set to false');
      
    } catch (error) {
      console.error('Error stopping screen share:', error);
      // Still update the state even if there's an error
      setIsScreenSharing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    startScreenShare,
    stopScreenShare
  }));

  useEffect(() => {
    return () => {
      if (screenTrackRef.current) {
        console.log('Component unmounting, cleaning up screen share');
        
        // Force cleanup without waiting for async operations
        try {
          if (clientRef.current && clientRef.current.connectionState === 'CONNECTED') {
            clientRef.current.unpublish(screenTrackRef.current);
          }
          
          // Always close the track
          screenTrackRef.current.close();
          screenTrackRef.current = null;
          
          // Update state
          setIsScreenSharing(false);
          
          console.log('Forced cleanup completed on unmount');
        } catch (error) {
          console.error('Error during forced cleanup:', error);
        }
      }
    };
  }, []);

  return null;
});

export default ScreenShare;
