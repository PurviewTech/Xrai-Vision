# Push Notifications Setup for Android Users

This guide explains how to set up Firebase Cloud Messaging (FCM) to send push notifications to Android users when they receive video call invitations.

## Overview

The current implementation only works for web users who have the dashboard open. To reach Android users (or users not actively on the web app), we need to implement Firebase Cloud Messaging (FCM).

## What's Been Implemented

### 1. **Firebase Configuration** (`src/firebaseConfig.js`)
- Added FCM messaging initialization
- Exported messaging instance

### 2. **Service Worker** (`public/firebase-messaging-sw.js`)
- Handles background push notifications
- Manages notification clicks and actions
- Supports Accept/Reject actions directly from notification

### 3. **Notification Service** (`src/services/notificationService.js`)
- Manages FCM token registration
- Handles foreground notifications
- Sends push notifications to multiple users
- Integrates with Firebase database

### 4. **Dashboard Integration** (`src/components/dashboard/Dashboard.jsx`)
- Initializes notification service on login
- Sends push notifications when starting new calls
- Cleans up tokens on logout

### 5. **Firebase Cloud Functions** (`functions/index.js`)
- Handles sending push notifications
- Automatically triggers on call invitation creation
- Manages notification responses

## Setup Steps

### Step 1: Firebase Console Configuration

1. **Go to Firebase Console** → Your Project → Project Settings
2. **Add Firebase to your web app** if not already done
3. **Generate VAPID Key**:
   - Go to Project Settings → Cloud Messaging
   - Generate a new Web Push certificate
   - Copy the VAPID key

### Step 2: Update VAPID Key

Replace `'YOUR_VAPID_KEY_HERE'` in `src/services/notificationService.js`:

```javascript
const token = await getToken(messaging, {
  vapidKey: 'YOUR_ACTUAL_VAPID_KEY_HERE'
});
```

### Step 3: Deploy Firebase Functions

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase Functions** (if not already done):
   ```bash
   firebase init functions
   ```

4. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

5. **Deploy functions**:
   ```bash
   firebase deploy --only functions
   ```

### Step 4: Update Service Worker URL

Make sure your service worker is accessible at `/firebase-messaging-sw.js` in your public directory.

### Step 5: Test the Implementation

1. **Start your development server**:
   ```bash
   npm start
   ```

2. **Open the app in multiple browsers/devices**
3. **Sign in with different users**
4. **Start a new call** and select multiple contacts
5. **Check if push notifications appear** on devices not actively using the app

## How It Works

### 1. **User Registration**
- When a user logs in, the notification service requests permission
- FCM token is generated and saved to Firebase
- Token is stored in `fcm_tokens/{userId}`

### 2. **Call Invitation**
- When starting a new call, invitations are sent to Firebase database
- Cloud Function automatically triggers and sends push notifications
- Notifications include Accept/Reject actions

### 3. **Notification Handling**
- **Foreground**: App shows custom notification
- **Background**: Service worker handles notification
- **Click Actions**: Direct navigation to video call or rejection handling

### 4. **Response Tracking**
- Accept/Reject actions are sent back to Firebase
- Caller receives notification of response
- Call status is updated accordingly

## Database Structure

```
fcm_tokens/
  ├── user1_uid/
  │   ├── token: "fcm_token_here"
  │   ├── platform: "web"
  │   └── lastUpdated: "2024-01-15T10:30:00.000Z"
  └── user2_uid/
      └── ...

incoming_calls/
  ├── user1_uid/
  │   └── call_id/
  │       ├── callId: "call_id"
  │       ├── title: "Group Call"
  │       ├── caller: "caller_uid"
  │       └── status: "pending"

call_responses/
  ├── caller_uid/
  │   └── call_id/
  │       ├── status: "accepted|rejected"
  │       └── timestamp: "2024-01-15T10:30:00.000Z"
```

## Troubleshooting

### Common Issues

1. **"FCM not supported" error**:
   - Make sure you're using HTTPS in production
   - Check if service worker is properly registered

2. **No notifications received**:
   - Verify VAPID key is correct
   - Check Firebase Console for FCM errors
   - Ensure notification permissions are granted

3. **Service worker not loading**:
   - Verify file is in `public/` directory
   - Check browser console for errors
   - Ensure HTTPS is used

4. **Cloud Functions not deploying**:
   - Check Firebase CLI version
   - Verify billing is enabled for your project
   - Check function logs in Firebase Console

### Debug Steps

1. **Check FCM token generation**:
   ```javascript
   console.log('FCM Token:', token);
   ```

2. **Verify token storage**:
   - Check Firebase Database for `fcm_tokens` entries

3. **Test Cloud Functions**:
   - Use Firebase Console → Functions → Logs
   - Check for any error messages

4. **Browser DevTools**:
   - Application tab → Service Workers
   - Console for any JavaScript errors

## Security Considerations

1. **VAPID Key**: Keep your VAPID key secure
2. **Token Storage**: FCM tokens are stored in Firebase Database
3. **Permission**: Always request user permission before sending notifications
4. **Rate Limiting**: Implement rate limiting for notification sending

## Next Steps

1. **Add notification icons** to `public/` directory
2. **Customize notification styling** for your brand
3. **Implement notification preferences** for users
4. **Add sound notifications** for better user experience
5. **Consider implementing notification channels** for different types of notifications

## Support

If you encounter issues:
1. Check Firebase Console logs
2. Verify all setup steps are completed
3. Test with a simple notification first
4. Check browser compatibility (Chrome, Firefox, Safari) 