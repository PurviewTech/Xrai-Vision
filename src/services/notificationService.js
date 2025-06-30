import { messaging, database } from '../firebaseConfig';
import { getToken, onMessage } from 'firebase/messaging';
import { ref, set, get, remove } from 'firebase/database';

class NotificationService {
  constructor() {
    this.fcmToken = null;
    this.isSupported = !!messaging;
  }

  // Request notification permission and get FCM token
  async requestPermissionAndGetToken(userId) {
    if (!this.isSupported) {
      console.log('FCM not supported in this environment');
      return null;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY_HERE' // You'll need to generate this in Firebase Console
      });

      if (token) {
        this.fcmToken = token;
        console.log('FCM Token:', token);
        
        // Save token to Firebase for this user
        await this.saveTokenToFirebase(userId, token);
        
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Save FCM token to Firebase
  async saveTokenToFirebase(userId, token) {
    try {
      await set(ref(database, `fcm_tokens/${userId}`), {
        token: token,
        platform: 'web',
        lastUpdated: new Date().toISOString()
      });
      console.log('FCM token saved to Firebase');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  // Remove FCM token from Firebase
  async removeTokenFromFirebase(userId) {
    try {
      await remove(ref(database, `fcm_tokens/${userId}`));
      console.log('FCM token removed from Firebase');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  // Send push notification to specific users
  async sendPushNotification(userIds, notificationData) {
    try {
      // Get FCM tokens for the users
      const tokens = await this.getFCMTokensForUsers(userIds);
      
      if (tokens.length === 0) {
        console.log('No FCM tokens found for users');
        return;
      }

      // Send notification to each token
      for (const token of tokens) {
        await this.sendNotificationToToken(token, notificationData);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Get FCM tokens for specific users
  async getFCMTokensForUsers(userIds) {
    const tokens = [];
    
    try {
      for (const userId of userIds) {
        const tokenRef = ref(database, `fcm_tokens/${userId}`);
        const snapshot = await get(tokenRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.token) {
            tokens.push(data.token);
          }
        }
      }
    } catch (error) {
      console.error('Error getting FCM tokens:', error);
    }
    
    return tokens;
  }

  // Send notification to a specific FCM token
  async sendNotificationToToken(token, notificationData) {
    try {
      // You'll need to implement this using Firebase Cloud Functions
      // or a backend service that can send FCM messages
      
      // For now, we'll use a simple HTTP request to a Cloud Function
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          notification: {
            title: notificationData.title || 'Incoming Call',
            body: notificationData.body || 'You have an incoming video call',
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
            data: {
              callId: notificationData.callId,
              caller: notificationData.caller,
              title: notificationData.title
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending notification to token:', error);
    }
  }

  // Listen for foreground messages
  onForegroundMessage(callback) {
    if (!this.isSupported) return;

    return onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload);
      callback(payload);
    });
  }

  // Initialize notification service for a user
  async initialize(userId) {
    if (!this.isSupported) return;

    // Request permission and get token
    await this.requestPermissionAndGetToken(userId);

    // Listen for foreground messages
    this.onForegroundMessage((payload) => {
      // Handle foreground notification
      this.showForegroundNotification(payload);
    });
  }

  // Show notification when app is in foreground
  showForegroundNotification(payload) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(
        payload.notification?.title || 'Incoming Call',
        {
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
        }
      );

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        notification.close();
        
        if (event.action === 'accept') {
          // Handle accept action
          const callId = payload.data?.callId;
          if (callId) {
            window.location.href = `/video-call?callId=${callId}`;
          }
        } else if (event.action === 'reject') {
          // Handle reject action
          const callId = payload.data?.callId;
          const userId = payload.data?.userId;
          if (callId && userId) {
            // Send rejection to Firebase
            this.sendRejectionToFirebase(userId, callId);
          }
        } else {
          // Default click - focus the app
          window.focus();
        }
      };
    }
  }

  // Send rejection to Firebase
  async sendRejectionToFirebase(userId, callId) {
    try {
      await set(ref(database, `call_responses/${userId}/${callId}`), {
        status: 'rejected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending rejection to Firebase:', error);
    }
  }

  // Cleanup when user logs out
  async cleanup(userId) {
    if (userId) {
      await this.removeTokenFromFirebase(userId);
    }
    this.fcmToken = null;
  }
}

export default new NotificationService(); 