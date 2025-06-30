import React, { useState, useEffect, useRef } from 'react';
import { ref, update, onValue, remove } from 'firebase/database';
import { database } from '../../firebaseConfig';

const Pointer = ({ callId, uid, cursorActive, setCursorActive }) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [cursorVelocity, setCursorVelocity] = useState({ x: 0, y: 0 });
  const [remoteCursors, setRemoteCursors] = useState({});
  const lastPosition = useRef({ x: 0, y: 0, time: 0 });
  const isAndroid = useRef(/Android/i.test(navigator.userAgent));

  const getCoordinates = (event) => {
    if (event.touches && event.touches.length > 0) {
      const touch = event.touches[0] || event.changedTouches[0];
      // For Android, we need to account for viewport scaling
      const rect = event.target.getBoundingClientRect();
      const scaleX = window.innerWidth / rect.width;
      const scaleY = window.innerHeight / rect.height;
      return {
        x: touch.clientX * scaleX,
        y: touch.clientY * scaleY
      };
    } else {
      return { x: event.clientX, y: event.clientY };
    }
  };

  const handlePointerMove = (e) => {
    if (!cursorActive) return;

    const now = performance.now();
    const timeDelta = now - lastPosition.current.time;
    const coords = getCoordinates(e);

    if (timeDelta > 0) {
      const xDelta = coords.x - lastPosition.current.x;
      const yDelta = coords.y - lastPosition.current.y;
      const velocityX = xDelta / timeDelta;
      const velocityY = yDelta / timeDelta;

      setCursorVelocity({ x: velocityX, y: velocityY });
      setCursorPosition({ x: coords.x, y: coords.y });

      // Throttle updates for better performance on Android
      if (timeDelta > (isAndroid.current ? 32 : 16)) { // 30fps for Android, 60fps for desktop
        sendCursorPosition(coords.x, coords.y);
      }
    }

    lastPosition.current = {
      x: coords.x,
      y: coords.y,
      time: now,
    };
  };

  const sendCursorPosition = (x, y) => {
    if (!cursorActive || !callId) return;

    try {
      const data = {
        x: x / window.innerWidth,
        y: y / window.innerHeight,
        userId: uid,
        timestamp: Date.now(),
        deviceType: isAndroid.current ? 'android' : 'desktop'
      };

      const cursorRef = ref(database, `videoCalls/${callId}/cursors/${uid}`);
      update(cursorRef, data);
    } catch (error) {
      console.error('Error sending cursor position:', error);
    }
  };

  useEffect(() => {
    if (cursorActive) {
      if (!isAndroid.current) {
        document.body.style.cursor = 'none';
      }
      document.addEventListener('pointermove', handlePointerMove, { passive: true });
      document.addEventListener('touchmove', handlePointerMove, { passive: true });
    } else {
      if (!isAndroid.current) {
        document.body.style.cursor = 'auto';
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('touchmove', handlePointerMove);
    }

    return () => {
      if (!isAndroid.current) {
        document.body.style.cursor = 'auto';
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('touchmove', handlePointerMove);
    };
  }, [cursorActive]);

  useEffect(() => {
    if (!callId) return;

    const cursorsRef = ref(database, `videoCalls/${callId}/cursors`);
    const unsubscribe = onValue(cursorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const cursors = snapshot.val();
        const now = Date.now();

        const activeCursors = {};
        Object.entries(cursors).forEach(([userId, data]) => {
          if (userId !== uid && now - data.timestamp < 2000) {
            activeCursors[userId] = data;
          }
        });

        setRemoteCursors(activeCursors);
      } else {
        setRemoteCursors({});
      }
    });

    return () => {
      unsubscribe();
      if (callId && uid) {
        const cursorRef = ref(database, `videoCalls/${callId}/cursors/${uid}`);
        remove(cursorRef);
      }
    };
  }, [callId, uid]);

  return (
    <>
      {/* Local cursor */}
      {cursorActive && (
        <>
          <div
            style={{
              position: 'fixed',
              left: cursorPosition.x,
              top: cursorPosition.y,
              pointerEvents: 'none',
              zIndex: 9999,
              width: isAndroid.current ? '32px' : '24px',
              height: isAndroid.current ? '32px' : '24px',
              transform: 'translate(-50%, -50%)',
              touchAction: 'none'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))',
              }}
            >
              <path d="M5 3L19 12L13 14L11 19L5 3Z" />
            </svg>
          </div>

          {/* Cursor trail - only on desktop */}
          {!isAndroid.current && (
            <div
              style={{
                position: 'fixed',
                left: cursorPosition.x,
                top: cursorPosition.y,
                pointerEvents: 'none',
                zIndex: 9998,
                width: '12px',
                height: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.4)',
                borderRadius: '50%',
                transform: 'translate3d(-50%, -50%, 0)',
                transition: 'all 0.1s ease',
                filter: 'blur(2px)',
                touchAction: 'none'
              }}
            />
          )}
        </>
      )}

      {/* Remote cursors */}
      {Object.entries(remoteCursors).map(([userId, data]) => {
        const x = data.x * window.innerWidth;
        const y = data.y * window.innerHeight;
        return (
          <div
            key={userId}
            style={{
              position: 'fixed',
              left: x,
              top: y,
              pointerEvents: 'none',
              zIndex: 9996,
              width: data.deviceType === 'android' ? '32px' : '24px',
              height: data.deviceType === 'android' ? '32px' : '24px',
              transform: 'translate(-50%, -50%)',
              touchAction: 'none'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="#22c55e"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))',
              }}
            >
              <path d="M5 3L19 12L13 14L11 19L5 3Z" />
            </svg>
          </div>
        );
      })}
    </>
  );
};

export default Pointer;
