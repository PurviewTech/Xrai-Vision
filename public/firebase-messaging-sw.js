// Firebase messaging service worker for push notifications
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAhnSrmFmORLNNn0m5FRlnCVFsdz9e1Ye0",
  authDomain: "xraivision-2fc49.firebaseapp.com",
  databaseURL: "https://xraivision-2fc49-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xraivision-2fc49",
  storageBucket: "xraivision-2fc49.firebasestorage.app",
  messagingSenderId: "469449360476",
  appId: "1:469449360476:web:ea9c235659619ea8941299",
  measurementId: "G-WGEKRGPYEC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Incoming Call';
  const notificationOptions = {
    body: payload.notification?.body || 'You have an incoming video call',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'video-call-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'accept',
        title: 'Accept',
        icon: '/accept-icon.png'
      },
      {
        action: 'reject',
        title: 'Reject',
        icon: '/reject-icon.png'
      }
    ],
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'accept') {
    // Handle accept action
    const callId = event.notification.data?.callId;
    if (callId) {
      // Open the app and navigate to the call
      event.waitUntil(
        clients.openWindow(`/video-call?callId=${callId}`)
      );
    }
  } else if (event.action === 'reject') {
    // Handle reject action
    const callId = event.notification.data?.callId;
    const userId = event.notification.data?.userId;
    if (callId && userId) {
      // Send rejection to Firebase
      fetch(`https://xraivision-2fc49-default-rtdb.asia-southeast1.firebasedatabase.app/call_responses/${userId}/${callId}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          timestamp: new Date().toISOString()
        })
      });
    }
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  // You can add logic here to handle when user dismisses notification
}); 