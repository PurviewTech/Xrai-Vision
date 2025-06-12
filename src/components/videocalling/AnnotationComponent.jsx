import React, { useEffect, useRef, useState } from 'react';
import { Edit } from 'lucide-react';

const AnnotationComponent = ({ 
  callId,
  database,
  agoraEngine,
  remoteVideos,
  remoteVideoContainerRef,
  uidRef,
  annotations,
  setAnnotations,
  isVideoFrozen,
  frozenFrameRef,
  frozenFrame,   // This should be a ref to the frozen image container or src? Assuming ref here
}) => {
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [activeRemoteUid, setActiveRemoteUid] = useState(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    if (agoraEngine) {
      agoraEngine.on("stream-message", (uid, data) => {
        try {
          const message = JSON.parse(new TextDecoder().decode(data));
          if (message.type === 'annotation' || message.type === 'clear-annotations') {
            handleAnnotationMessage(message);
          }
        } catch (error) {
          console.error("Error handling stream message:", error);
        }
      });
    }
  }, [agoraEngine]);

  // Canvas event listeners for drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e) => startDrawing(e);
    const handleMouseMove = (e) => draw(e);
    const handleMouseUp = () => stopDrawing();
    const handleMouseOut = () => stopDrawing();

    const handleTouchStart = (e) => { e.preventDefault(); startDrawing(e); };
    const handleTouchMove = (e) => { e.preventDefault(); draw(e); };
    const handleTouchEnd = () => stopDrawing();

    if (isAnnotating) {
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseout', handleMouseOut);
      canvas.addEventListener('touchstart', handleTouchStart);
      canvas.addEventListener('touchmove', handleTouchMove);
      canvas.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseout', handleMouseOut);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isAnnotating]);

  // Handle window resize for canvas repositioning
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        if (isAnnotating && activeRemoteUid) {
          if (activeRemoteUid === 'frozen') {
            setupCanvasForFrozen();
          } else {
            setupCanvas();
          }
        }
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAnnotating, activeRemoteUid]);

  const toggleAnnotation = (remoteUid) => {
    if (isAnnotating && activeRemoteUid === remoteUid) {
      setIsAnnotating(false);
      setActiveRemoteUid(null);
      clearCanvas();
      sendClearAnnotationsMessage();
    } else {
      setIsAnnotating(true);
      setActiveRemoteUid(remoteUid);
      if (remoteUid === 'frozen') {
        setupCanvasForFrozen();
      } else {
        setupCanvas();
      }
    }
  };

  // Setup canvas for normal remote video container
  const setupCanvas = () => {
    const videoContainer = remoteVideoContainerRef.current;
    const canvas = canvasRef.current;
    if (!videoContainer || !canvas) return;

    const rect = videoContainer.getBoundingClientRect();

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    canvas.width = width;
    canvas.height = height;
    canvas.style.position = 'absolute';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.zIndex = '30';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'auto';
    canvas.style.backgroundColor = 'transparent';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Setup canvas for frozen frame container
  const setupCanvasForFrozen = () => {
    // Assuming frozenFrame is a ref to the container holding the frozen image
    const frozenContainer = frozenFrameRef?.current;
    const canvas = canvasRef.current;
    if (!frozenContainer || !canvas) return;

    const rect = frozenContainer.getBoundingClientRect();

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    canvas.width = width;
    canvas.height = height;

    // Position canvas relative to frozen container (top-left corner)
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.zIndex = '35'; // Lower than button (40) but higher than image (30)
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'auto';
    canvas.style.backgroundColor = 'transparent';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
  };

  const startDrawing = (e) => {
    if (!isAnnotating) return;
    isDrawing.current = true;
    const { offsetX, offsetY } = getCoordinates(e);
    lastX.current = offsetX;
    lastY.current = offsetY;
  };

  const draw = (e) => {
    if (!isDrawing.current || !isAnnotating) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { offsetX, offsetY } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(offsetX, offsetY);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    sendAnnotationData({
      fromX: lastX.current / canvas.width,
      fromY: lastY.current / canvas.height,
      toX: offsetX / canvas.width,
      toY: offsetY / canvas.height
    });

    lastX.current = offsetX;
    lastY.current = offsetY;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };

    if (e.type.includes('touch')) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top
      };
    } else {
      return {
        offsetX: e.offsetX || 0,
        offsetY: e.offsetY || 0
      };
    }
  };

  const sendAnnotationData = async (points) => {
    try {
      if (!activeRemoteUid || !agoraEngine) return;

      const message = JSON.stringify({
        type: 'annotation',
        targetUid: activeRemoteUid,
        sourceUid: uidRef.current,
        points
      });

      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      await agoraEngine.sendStreamMessage(data);
    } catch (error) {
      console.error("Error sending annotation data:", error);
    }
  };

  const sendClearAnnotationsMessage = async () => {
    try {
      if (!agoraEngine || !uidRef.current) return;
      const message = JSON.stringify({
        type: 'clear-annotations',
        sourceUid: uidRef.current
      });
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      await agoraEngine.sendStreamMessage(data);
    } catch (error) {
      console.error("Error sending clear annotations message:", error);
    }
  };

  const renderAnnotations = (targetUid) => {
    const userAnnotations = annotations[targetUid] || [];
    if (userAnnotations.length === 0) return null;

    const videoContainer = document.querySelector('.w-[790px].h-[480px]') || 
                          document.querySelector('.relative.w-[790px].h-[480px]');
    if (!videoContainer) return null;

    const rect = videoContainer.getBoundingClientRect();

    return (
      <svg 
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 20
        }}
        viewBox={`0 0 ${rect.width} ${rect.height}`}
        preserveAspectRatio="none"
      >
        {userAnnotations.map((annotation, index) => {
          const points = annotation.points || {};
          const fromX = points.fromX * rect.width;
          const fromY = points.fromY * rect.height;
          const toX = points.toX * rect.width;
          const toY = points.toY * rect.height;
          return (
            <line
              key={`anno-${targetUid}-${index}`}
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke="red"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    );
  };

  const handleAnnotationMessage = (message) => {
    const { sourceUid, points, type } = message;
    if (type === 'clear-annotations') {
      setAnnotations(prev => {
        const updatedAnnotations = { ...prev };
        delete updatedAnnotations[sourceUid];
        return updatedAnnotations;
      });
      return;
    }
    if (type === 'annotation') {
      setAnnotations(prev => {
        const newAnnotation = {
          id: Date.now(),
          points,
          timestamp: Date.now()
        };
        const updatedAnnotations = {
          ...prev,
          [sourceUid]: [...(prev[sourceUid] || []), newAnnotation]
        };
        return updatedAnnotations;
      });
      setTimeout(() => {
        setAnnotations(prev => {
          const sourceAnnotations = prev[sourceUid] || [];
          if (sourceAnnotations.length === 0) return prev;
          const filtered = sourceAnnotations.slice(1);
          return {
            ...prev,
            [sourceUid]: filtered
          };
        });
      }, 3000);
    }
  };

  return (
    <>
      {/* Normal video mode */}
      {!isVideoFrozen && (
        <>
          <canvas
            ref={canvasRef}
            className="absolute z-30"
            style={{ display: isAnnotating ? 'block' : 'none' }}
          />
          {Object.keys(remoteVideos).map((uid) => (
            <div
              key={uid}
              className="relative w-full h-full flex justify-center items-center"
            >
              <div className={`absolute bottom-3 right-3 p-2 rounded-full ${isAnnotating && activeRemoteUid === uid ? 'bg-red-600' : 'bg-blue-600'} z-40`}>
                <Edit 
                  size={24} 
                  className="cursor-pointer text-white" 
                  onClick={() => toggleAnnotation(uid)} 
                />
              </div>
              <div 
                id={`player-${uid}`} 
                className="absolute inset-0 w-full h-full"
              />
              {renderAnnotations(uid)}
            </div>
          ))}
        </>
      )}

      {/* Frozen video mode */}
      {isVideoFrozen && frozenFrame && (
        <div
          className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
          style={{ userSelect: 'none', touchAction: 'none' }}
          ref={frozenFrameRef}
        >
          {/* Frozen image with z-index 30 */}
          <img
            src={typeof frozenFrame === 'string' ? frozenFrame : ''}
            alt="Frozen Frame"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 30
            }}
            draggable={false}
          />
          
          {/* Canvas with z-index 35 - above image but below button */}
          <canvas
            ref={canvasRef}
            className="absolute"
            style={{
              display: isAnnotating && activeRemoteUid === 'frozen' ? 'block' : 'none',
              pointerEvents: isAnnotating && activeRemoteUid === 'frozen' ? 'auto' : 'none',
              zIndex: 35
            }}
          />
          
          {/* Annotation button with highest z-index 50 - always on top and clickable */}
          <div
            className={`absolute bottom-3 right-3 p-2 rounded-full ${
              isAnnotating && activeRemoteUid === 'frozen' ? 'bg-red-600' : 'bg-blue-600'
            } cursor-pointer shadow-lg`}
            style={{
              pointerEvents: 'auto', // Force clickable
              zIndex: 50 // Highest z-index
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              toggleAnnotation('frozen');
            }}
            title="Toggle Annotation on Frozen Frame"
          >
            <Edit size={24} className="text-white" />
          </div>
        </div>
      )}

      {/* Annotation status */}
      {isAnnotating && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-50">
          Annotation Mode: Drawing on {activeRemoteUid ? `User ${activeRemoteUid}` : 'Remote Video'}
        </div>
      )}
    </>
  );
};

export default AnnotationComponent;