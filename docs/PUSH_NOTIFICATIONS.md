# Push Notifications for Newspaper Subscriptions

This document describes the push notification system that alerts users when newspapers they are subscribed to publish new articles.

## Overview

The system uses the Web Push API to send real-time notifications to users' devices when new posts are published by newspapers they follow.

## Architecture

### Components

1. **Database Schema** (`src/lib/server/schema.ts`)
   - `push_subscriptions` table stores Web Push subscription data
   - Links subscriptions to user accounts
   - Stores encryption keys and endpoint URLs

2. **Push Notification Service** (`src/lib/server/services/push-notification.service.ts`)
   - `subscribeToPushNotifications()` - Saves user subscription to database
   - `unsubscribeFromPushNotifications()` - Removes subscription
   - `notifyNewspaperSubscribers()` - Sends notifications to all newspaper subscribers
   - `sendPushNotificationToUser()` - Sends notification to a specific user
   - `getVapidPublicKey()` - Returns public key for client-side subscription

3. **Service Worker** (`src/service-worker.js`)
   - Handles `push` events and displays notifications
   - Handles `notificationclick` events to navigate to articles
   - Manages notification display with proper icons and badges

4. **API Routes**
   - `POST /api/push/subscribe` - Subscribe to push notifications
   - `POST /api/push/unsubscribe` - Unsubscribe from notifications
   - `GET /api/push/vapid-public-key` - Get VAPID public key

5. **Client Component** (`src/lib/components/PushNotificationManager.svelte`)
   - UI for requesting notification permission
   - Handles subscription/unsubscription
   - Shows current notification status

## User Flow

1. User subscribes to a newspaper
2. User clicks "Enable Notifications" button
3. Browser requests notification permission
4. If granted, service worker creates push subscription
5. Subscription is saved to database via API
6. When a journalist publishes an article:
   - All subscribers are retrieved from database
   - Push notifications are sent to each subscriber
   - Users receive notification with article title
   - Clicking notification opens the article

## Implementation Details

### VAPID Keys

The system uses VAPID (Voluntary Application Server Identification) for authentication:

```bash
# Generate new VAPID keys
npx web-push generate-vapid-keys
```

Add the keys to `.env`:

```env
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_SUBJECT=mailto:admin@yoursite.com
```

### Notification Payload

```typescript
{
  title: "📰 Newspaper Name",
  body: "Article Title",
  icon: "/favicon.png",
  badge: "/badge.png",
  data: {
    url: "/posts/123",
    articleId: 123,
    newspaperId: 45
  }
}
```

### Error Handling

- Invalid subscriptions (410 Gone) are automatically removed
- Failed notifications are logged but don't block article creation
- Notifications are sent asynchronously to avoid blocking

## Database Schema

```sql
CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  subscribed_at TIMESTAMP DEFAULT NOW()
);
```

## Usage Example

### In Article Creation

```typescript
// After creating article
if (newspaperId) {
  await notifyNewspaperSubscribers({
    newspaperId: parseInt(newspaperId),
    newspaperName: newspaper.name,
    articleId: article.id,
    articleTitle: article.title
  });
}
```

### In UI Components

```svelte
<script>
  import PushNotificationManager from '$lib/components/PushNotificationManager.svelte';
</script>

<PushNotificationManager />
```

## Browser Support

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Supported (macOS 13+, iOS 16.4+)
- Opera: ✅ Fully supported

## Security Considerations

1. **VAPID Keys**: Private key must be kept secret
2. **User Authentication**: Only authenticated users can subscribe
3. **Endpoint Validation**: Subscriptions are validated before storage
4. **HTTPS Required**: Push notifications only work over HTTPS
5. **User Consent**: Explicit permission required from users

## Troubleshooting

### Notifications not appearing

1. Check browser notification permissions
2. Verify service worker is registered
3. Check VAPID keys are configured correctly
4. Ensure HTTPS is enabled (required for push)

### Subscriptions failing

1. Check network requests in DevTools
2. Verify service worker registration
3. Check console for errors
4. Ensure VAPID public key is accessible

### Testing Locally

1. Use `localhost` (HTTPS not required)
2. Check browser console for errors
3. Use DevTools Application tab to inspect service worker
4. Test notifications with browser DevTools

## Future Enhancements

- Notification preferences (daily digest vs instant)
- Custom notification sounds
- Rich notifications with images
- Notification grouping
- Unread notification count
- Web push analytics
