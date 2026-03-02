# Push Notifications - Quick Reference

## Quick Start

### 1. Setup (One-time)

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# Add to .env
VAPID_PUBLIC_KEY=your-key
VAPID_PRIVATE_KEY=your-key
VAPID_SUBJECT=mailto:admin@domain.com

# Run migration
psql -d database -f docs/migrations/add_push_subscriptions.sql
```

### 2. Add to UI

```svelte
<script>
  import PushNotificationManager from '$lib/components/PushNotificationManager.svelte';
</script>

<PushNotificationManager />
```

### 3. Done

Notifications are automatically sent when articles are published.

---

## Common Tasks

### Send Notification to User

```typescript
import { sendPushNotificationToUser } from '$lib/server/services/push-notification.service';

await sendPushNotificationToUser(userId, {
  title: 'Title',
  body: 'Message',
  data: { url: '/path' }
});
```

### Send to Newspaper Subscribers

```typescript
import { notifyNewspaperSubscribers } from '$lib/server/services/push-notification.service';

await notifyNewspaperSubscribers({
  newspaperId: 1,
  newspaperName: 'Daily News',
  articleId: 123,
  articleTitle: 'Breaking News'
});
```

### Check Subscription Status

```typescript
const subs = await db
  .select()
  .from(pushSubscriptions)
  .where(eq(pushSubscriptions.userId, userId));
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/push/subscribe` | POST | Subscribe to notifications |
| `/api/push/unsubscribe` | POST | Unsubscribe from notifications |
| `/api/push/vapid-public-key` | GET | Get VAPID public key |

---

## Database Queries

### Count Total Subscriptions

```sql
SELECT COUNT(*) FROM push_subscriptions;
```

### List User Devices

```sql
SELECT id, user_agent, subscribed_at 
FROM push_subscriptions 
WHERE user_id = 'user-id';
```

### Clean Old Subscriptions

```sql
DELETE FROM push_subscriptions 
WHERE subscribed_at < NOW() - INTERVAL '90 days';
```

---

## Browser Testing

### Check Permission

```javascript
console.log(Notification.permission);
// "granted", "denied", or "default"
```

### Request Permission

```javascript
await Notification.requestPermission();
```

### Check Subscription

```javascript
const reg = await navigator.serviceWorker.ready;
const sub = await reg.pushManager.getSubscription();
console.log(sub);
```

### Test Notification

```javascript
new Notification('Test', { body: 'Testing!' });
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No notifications appearing | Check browser permission: `Notification.permission` |
| Service worker not working | DevTools → Application → Unregister → Reload |
| Invalid subscription | Check VAPID keys match in .env |
| 410 error | Subscription expired, it's auto-removed |
| HTTPS error | Use localhost or enable HTTPS |

---

## File Locations

```
src/
├── lib/
│   ├── components/
│   │   └── PushNotificationManager.svelte    # UI component
│   └── server/
│       ├── schema.ts                          # DB schema (modified)
│       └── services/
│           └── push-notification.service.ts   # Core service
├── routes/
│   ├── api/
│   │   └── push/
│   │       ├── subscribe/+server.ts           # Subscribe endpoint
│   │       ├── unsubscribe/+server.ts         # Unsubscribe endpoint
│   │       └── vapid-public-key/+server.ts    # VAPID key endpoint
│   └── (authenticated)/(fullscreen)/posts/new/
│       └── +page.server.ts                    # Article creation (modified)
└── service-worker.js                          # Service worker (modified)

docs/
├── migrations/
│   └── add_push_subscriptions.sql             # DB migration
├── PUSH_NOTIFICATIONS.md                      # Full documentation
├── PUSH_NOTIFICATIONS_SETUP.md                # Setup guide
├── PUSH_NOTIFICATIONS_USAGE_EXAMPLE.md        # Code examples
└── PUSH_NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md  # Summary
```

---

## Environment Variables

```env
# Required
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9...
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6O7eDr5PO4p...
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Optional (defaults shown)
NODE_ENV=production
```

---

## Notification Payload Structure

```typescript
{
  title: string;           // Notification title
  body: string;            // Notification message
  icon?: string;           // Icon URL (default: /favicon.png)
  badge?: string;          // Badge URL (default: /badge.png)
  data?: {                 // Custom data
    url?: string;          // URL to open on click
    articleId?: number;    // Article ID
    newspaperId?: number;  // Newspaper ID
    [key: string]: any;    // Any other data
  };
}
```

---

## Browser DevTools

### Check Service Worker

1. Open DevTools
2. Application tab
3. Service Workers section
4. Should show registered worker

### Check Push Subscription

1. Open DevTools
2. Application tab
3. Service Workers section
4. Push Messaging → Click "Send Push"

### View Notifications

1. Open DevTools
2. Application tab
3. Storage → Notifications

---

## Production Checklist

- [ ] Generate production VAPID keys
- [ ] Set environment variables
- [ ] Run database migration
- [ ] Test on staging
- [ ] Enable HTTPS
- [ ] Test on production
- [ ] Monitor error logs
- [ ] Set up alerts for failures

---

## Performance Tips

1. **Async sending**: Already implemented, notifications don't block
2. **Batch notifications**: Use `Promise.allSettled()` for multiple users
3. **Clean stale subs**: Run periodic cleanup of old subscriptions
4. **Index properly**: Indexes already added to push_subscriptions table
5. **Error handling**: Failed sends are logged and auto-remove 410s

---

## Security Checklist

- [ ] VAPID private key in env vars (not code)
- [ ] VAPID keys not in git
- [ ] Different keys for dev/prod
- [ ] HTTPS enabled in production
- [ ] Auth required for subscribe endpoint
- [ ] User ID validated before sending

---

## Monitoring Queries

```sql
-- Subscription stats
SELECT 
  COUNT(*) as total_subs,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(device_count) as avg_devices_per_user
FROM (
  SELECT user_id, COUNT(*) as device_count 
  FROM push_subscriptions 
  GROUP BY user_id
) sub_counts;

-- Recent activity
SELECT DATE(subscribed_at) as date, COUNT(*) as new_subs
FROM push_subscriptions 
WHERE subscribed_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(subscribed_at)
ORDER BY date;

-- Top user agents
SELECT 
  user_agent, 
  COUNT(*) as count 
FROM push_subscriptions 
GROUP BY user_agent 
ORDER BY count DESC 
LIMIT 10;
```

---

## Quick Links

- [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push npm](https://www.npmjs.com/package/web-push)
- [VAPID Spec](https://tools.ietf.org/html/rfc8292)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
