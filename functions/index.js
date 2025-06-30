const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Cloud Function to send push notifications
exports.sendNotification = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { token, notification } = req.body;

    if (!token || !notification) {
      res.status(400).json({ error: 'Missing token or notification data' });
      return;
    }

    const message = {
      token: token,
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        requireInteraction: notification.requireInteraction
      },
      data: notification.data,
      android: {
        notification: {
          icon: notification.icon,
          color: '#4285f4',
          priority: 'high',
          channelId: 'video-calls',
          actions: notification.actions
        }
      },
      webpush: {
        notification: {
          icon: notification.icon,
          badge: notification.badge,
          tag: notification.tag,
          requireInteraction: notification.requireInteraction,
          actions: notification.actions
        },
        fcm_options: {
          link: `/video-call?callId=${notification.data.callId}`
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cloud Function to send notifications when call invitations are created
exports.onCallInvitationCreated = functions.database
  .ref('/incoming_calls/{userId}/{callId}')
  .onCreate(async (snapshot, context) => {
    const invitationData = snapshot.val();
    const { userId, callId } = context.params;

    try {
      // Get the user's FCM token
      const tokenSnapshot = await admin.database()
        .ref(`/fcm_tokens/${userId}`)
        .once('value');

      if (!tokenSnapshot.exists()) {
        console.log(`No FCM token found for user ${userId}`);
        return;
      }

      const tokenData = tokenSnapshot.val();
      const token = tokenData.token;

      if (!token) {
        console.log(`No valid FCM token for user ${userId}`);
        return;
      }

      // Send push notification
      const message = {
        token: token,
        notification: {
          title: invitationData.title || 'Incoming Call',
          body: `${invitationData.callerName || invitationData.caller} is calling you`,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'video-call-notification',
          requireInteraction: true
        },
        data: {
          callId: invitationData.callId,
          caller: invitationData.caller,
          title: invitationData.title,
          userId: userId
        },
        android: {
          notification: {
            icon: '/logo.png',
            color: '#4285f4',
            priority: 'high',
            channelId: 'video-calls',
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
            ]
          }
        },
        webpush: {
          notification: {
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
            ]
          },
          fcm_options: {
            link: `/video-call?callId=${invitationData.callId}`
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`Successfully sent notification to user ${userId}:`, response);
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
    }
  });

// Cloud Function to handle notification responses
exports.onNotificationResponse = functions.database
  .ref('/call_responses/{userId}/{callId}')
  .onCreate(async (snapshot, context) => {
    const responseData = snapshot.val();
    const { userId, callId } = context.params;

    try {
      // Get the original caller's FCM token
      const callSnapshot = await admin.database()
        .ref(`/videoCalls/${callId}`)
        .once('value');

      if (!callSnapshot.exists()) {
        console.log(`Call ${callId} not found`);
        return;
      }

      const callData = callSnapshot.val();
      const callerId = callData.createdBy;

      const tokenSnapshot = await admin.database()
        .ref(`/fcm_tokens/${callerId}`)
        .once('value');

      if (!tokenSnapshot.exists()) {
        console.log(`No FCM token found for caller ${callerId}`);
        return;
      }

      const tokenData = tokenSnapshot.val();
      const token = tokenData.token;

      if (!token) {
        console.log(`No valid FCM token for caller ${callerId}`);
        return;
      }

      // Send response notification to caller
      const message = {
        token: token,
        notification: {
          title: 'Call Response',
          body: responseData.status === 'rejected' 
            ? `${userId} rejected your call` 
            : `${userId} accepted your call`,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'call-response'
        },
        data: {
          callId: callId,
          responder: userId,
          status: responseData.status
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`Successfully sent response notification to caller ${callerId}:`, response);
    } catch (error) {
      console.error(`Error sending response notification:`, error);
    }
  }); 