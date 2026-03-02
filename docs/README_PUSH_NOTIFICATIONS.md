# 📰 Push Notifications for Newspaper Subscriptions

A complete implementation of Web Push API notifications that alert users when newspapers they subscribe to publish new articles.

## ✨ Features

- 🔔 **Real-time notifications** when subscribed newspapers publish articles
- 📱 **Multi-device support** - users can subscribe from multiple devices
- 🔒 **Secure** - uses VAPID authentication and encrypted communications
- 🚀 **Asynchronous** - doesn't block article publishing
- 🧹 **Auto-cleanup** - removes invalid/expired subscriptions automatically
- 🎨 **User-friendly UI** - simple enable/disable component
- 🌐 **Cross-browser** - works on Chrome, Firefox, Safari, Edge

## 📋 What's Included

### Core Files

1. **Database Schema** (`src/lib/server/schema.ts`)
   - `pushSubscriptions` table for storing subscriptions

2. **Service Layer** (`src/lib/server/services/push-notification.service.ts`)
   - Subscribe/unsubscribe management
   - Notification sending logic
   - VAPID key management

3. **API Routes**
   - `POST /api/push/subscribe` - Subscribe to notifications
   - `POST /api/push/unsubscribe` - Unsubscribe
   - `GET /api/push/vapid-public-key` - Get public key

4. **UI Component** (`src/lib/components/PushNotificationManager.svelte`)
   - Permission request UI
   - Subscribe/unsubscribe buttons
   - Status display

5. **Service Worker** (`src/service-worker.js`)
   - Push event handling
   - Notification display
   - Click handling

6. **Integration** (Article creation updated)
   - Automatically sends notifications on article publish

### Documentation

- 📘 **PUSH_NOTIFICATIONS.md** - Complete technical documentation
- 🚀 **PUSH_NOTIFICATIONS_SETUP.md** - Step-by-step setup guide
- 💡 **PUSH_NOTIFICATIONS_USAGE_EXAMPLE.md** - Code examples
- 📊 **PUSH_NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md** - Overview
- ⚡ **PUSH_NOTIFICATIONS_QUICK_REFERENCE.md** - Quick reference

## 🚀 Quick Start

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### 2. Configure Environment

Add to `.env`:

```env
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### 3. Run Database Migration

```bash
psql -d your_database -f docs/migrations/add_push_subscriptions.sql
```

Or with Drizzle:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Add to Your UI

```svelte
<script>
  import PushNotificationManager from '$lib/components/PushNotificationManager.svelte';
</script>

<PushNotificationManager />
```

### 5. Test It

1. Subscribe to a newspaper
2. Click "Enable Notifications"
3. Grant permission
4. Publish an article in that newspaper
5. Receive notification! 🎉

## 📖 How It Works

```
┌─────────────┐
│ User        │
│ subscribes  │
│ to newspaper│
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ User enables    │
│ push            │
│ notifications   │
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│ Browser requests    │
│ permission          │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Service worker      │
│ creates subscription│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Subscription saved  │
│ to database         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Article published   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Query all           │
│ subscribers         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Send push           │
│ notifications       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ User sees           │
│ notification        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Click opens article │
└─────────────────────┘
```

## 🔧 Usage Examples

### Send Custom Notification

```typescript
import { sendPushNotificationToUser } from '$lib/server/services/push-notification.service';

await sendPushNotificationToUser(userId, {
  title: '🎉 Welcome!',
  body: 'Thanks for enabling notifications',
  data: { url: '/welcome' }
});
```

### Notify Newspaper Subscribers

```typescript
import { notifyNewspaperSubscribers } from '$lib/server/services/push-notification.service';

await notifyNewspaperSubscribers({
  newspaperId: 1,
  newspaperName: 'Daily News',
  articleId: 123,
  articleTitle: 'Breaking News Story'
});
```

### Add to Different Pages

**Settings Page:**

```svelte
<div class="settings">
  <h2>Notifications</h2>
  <PushNotificationManager />
</div>
```

**Newspaper Page:**

```svelte
{#if isSubscribed}
  <div class="flex gap-2">
    <button>Unsubscribe</button>
    <PushNotificationManager />
  </div>
{/if}
```

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 50+     | ✅ Full support |
| Firefox | 44+     | ✅ Full support |
| Safari  | 16.4+   | ✅ Full support |
| Edge    | 17+     | ✅ Full support |
| Opera   | 37+     | ✅ Full support |

## 🔒 Security

- ✅ VAPID authentication for server identification
- ✅ End-to-end encryption (P-256 ECDH)
- ✅ HTTPS required (or localhost for dev)
- ✅ User authentication required for all endpoints
- ✅ Explicit user permission required
- ✅ Private keys stored securely in environment variables

## 📊 Database Schema

```sql
CREATE TABLE push_subscriptions (
  id                INTEGER PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES account(id),
  endpoint          TEXT NOT NULL UNIQUE,
  p256dh_key        TEXT NOT NULL,
  auth_key          TEXT NOT NULL,
  user_agent        TEXT,
  subscribed_at     TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_push_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_user ON push_subscriptions(user_id);
```

## 🐛 Troubleshooting

### Notifications not appearing?

**Check permission:**

```javascript
console.log(Notification.permission); // Should be "granted"
```

**Check subscription:**

```javascript
const reg = await navigator.serviceWorker.ready;
const sub = await reg.pushManager.getSubscription();
console.log(sub); // Should not be null
```

**Check service worker:**

- DevTools → Application → Service Workers
- Should show active service worker

### Service worker not updating?

1. DevTools → Application → Service Workers
2. Click "Unregister"
3. Reload page
4. Service worker re-registers with latest code

### VAPID key errors?

- Ensure keys are in `.env`
- Verify keys match what client is using
- Check VAPID subject is a valid mailto: URL

## 📈 Monitoring

### Database Queries

**Total subscriptions:**

```sql
SELECT COUNT(*) FROM push_subscriptions;
```

**Subscriptions by user:**

```sql
SELECT user_id, COUNT(*) as devices
FROM push_subscriptions
GROUP BY user_id
ORDER BY devices DESC;
```

**Recent subscriptions:**

```sql
SELECT * FROM push_subscriptions
ORDER BY subscribed_at DESC
LIMIT 10;
```

## 🎯 Performance

- **Async delivery** - notifications sent without blocking
- **Efficient queries** - indexed database tables
- **Auto cleanup** - expired subscriptions removed automatically
- **Batched sends** - uses `Promise.allSettled()` for multiple recipients
- **Minimal overhead** - negligible impact on article creation

## 📝 Testing

### Manual Testing

1. **Subscribe Flow:**
   - Navigate to page with notification manager
   - Click "Enable Notifications"
   - Grant permission
   - Verify in database

2. **Notification Delivery:**
   - Subscribe to newspaper
   - Publish article
   - Verify notification received
   - Click notification
   - Verify article opens

3. **Unsubscribe:**
   - Click "Disable Notifications"
   - Verify removed from database
   - Publish article
   - Verify no notification

### Automated Testing

Create test endpoint:

```typescript
// src/routes/api/test-notification/+server.ts
export const POST = async ({ locals }) => {
  await sendPushNotificationToUser(locals.account.id, {
    title: 'Test',
    body: 'This is a test notification'
  });
  return json({ success: true });
};
```

## 🚀 Deployment

### Pre-deployment Checklist

- [ ] Generate production VAPID keys
- [ ] Set environment variables in hosting platform
- [ ] Run database migration
- [ ] Test on staging environment
- [ ] Verify HTTPS is enabled
- [ ] Test on production with real devices

### Environment Variables (Production)

```env
VAPID_PUBLIC_KEY=<production-public-key>
VAPID_PRIVATE_KEY=<production-private-key>
VAPID_SUBJECT=mailto:admin@yourdomain.com
NODE_ENV=production
```

## 🔮 Future Enhancements

Potential improvements:

- 📅 **Notification preferences** - daily digest, quiet hours
- 🖼️ **Rich notifications** - include article images
- 📊 **Analytics** - track delivery and engagement rates
- 🎯 **Targeting** - send to specific user segments
- 🔕 **Smart delivery** - based on user timezone/behavior
- 🏷️ **Categories** - allow filtering by topic
- ⭐ **Priority levels** - urgent vs normal notifications
- 💬 **Two-way messaging** - reply to notifications

## 📚 Documentation

- **[Complete Documentation](docs/PUSH_NOTIFICATIONS.md)** - In-depth technical docs
- **[Setup Guide](docs/PUSH_NOTIFICATIONS_SETUP.md)** - Step-by-step instructions
- **[Usage Examples](docs/PUSH_NOTIFICATIONS_USAGE_EXAMPLE.md)** - Code samples
- **[Quick Reference](docs/PUSH_NOTIFICATIONS_QUICK_REFERENCE.md)** - Quick lookup
- **[Implementation Summary](docs/PUSH_NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md)** - Overview

## 🤝 Contributing

When contributing to push notifications:

1. Test on multiple browsers
2. Verify service worker changes don't break caching
3. Update documentation for new features
4. Test notification delivery thoroughly
5. Consider accessibility (notification content should be clear)

## 📄 License

Same as the main project.

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review browser console for errors
3. Verify environment variables are set correctly
4. Check service worker registration
5. Consult the documentation

## 🎉 Credits

Built using:

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push](https://github.com/web-push-libs/web-push) library
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Happy Notifying! 🔔**
