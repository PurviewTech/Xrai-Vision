import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';

const PointerOverlay = ({ database, callId, remoteVideoContainerRef }) => {
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorActive, setCursorActive] = useState(false);

  useEffect(() => {
    // Listen for pointer updates from Firebase
    const pointerRef = ref(database, `videoCalls/${callId}/pointer`);
    const unsubscribe = onValue(pointerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPointerPosition({ x: data.x, y: data.y });
        setIsPointerActive(data.active);
      }
    });

    return () => unsubscribe();
  }, [database, callId]);

  useEffect(() => {
    if (cursorActive) {
      document.addEventListener('mousemove', handleMouseMove);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [cursorActive]);

  const moveCursorTo = (x, y) => {
    setCursorPosition({ x, y });
    setCursorVisible(true);
  };

  const handleMouseMove = (e) => {
    if (cursorActive) {
      moveCursorTo(e.clientX, e.clientY);
    }
  };

  const handleMouseLeave = () => {
    // Update pointer state in Firebase
    update(ref(database, `videoCalls/${callId}/pointer`), {
      active: false,
      timestamp: Date.now()
    });
  };

  return (
    <div 
      className="pointer-overlay"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
        cursor: 'none'
      }}
    >
      {isPointerActive && (
        <div
          className="pointer"
          style={{
            position: 'absolute',
            left: `${pointerPosition.x}%`,
            top: `${pointerPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            backgroundColor: 'red',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            transition: 'all 0.1s ease-out'
          }}
        />
      )}

      {/* Cursor overlay */}
      {cursorActive && (
        <div
          style={{
            position: "fixed",
            left: cursorPosition.x,
            top: cursorPosition.y,
            pointerEvents: "none",
            zIndex: 9999,
            width: 24,
            height: 24,
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderRadius: "50%",
            boxShadow: "0 0 8px 2px rgba(59, 130, 246, 0.8)",
            transition: "transform 0.1s ease",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}

      {/* Toggle button */}
      <button
        onClick={() => setCursorActive((prev) => !prev)}
        className="fixed bottom-24 right-10 p-3 bg-gray-800 text-white rounded-full shadow-md z-50"
      >
        {cursorActive ? (
          <span className="text-sm font-medium">Switch to Mouse</span>
        ) : (
          <span className="text-sm font-medium">Enable Pointer</span>
        )}
      </button>
    </div>
  );
};

export default PointerOverlay;
