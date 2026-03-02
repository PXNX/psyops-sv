# Push Notifications Setup Guide

## Prerequisites

- HTTPS enabled (or localhost for development)
- Service Worker support in browsers
- `web-push` npm package (already installed)

## Step-by-Step Setup

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This will output:

```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBrXhqhbdq5sM1ZG5Eyk
Private Key: UUxI4O8-FbRouAevSmBQ6O7eDr5PO4p3vxO6bFPzSKk
```

### 2. Update Environment Variables

Add to your `.env` file:

```env
# Push Notifications
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

**Important**: Replace with your generated keys and your actual email.

### 3. Run Database Migration

Apply the migration to create the `push_subscriptions` table:

```bash
# Using psql
psql -U your_user -d your_database -f docs/migrations/add_push_subscriptions.sql

# Or using your database management tool
# Run the SQL from: docs/migrations/add_push_subscriptions.sql
```

Alternatively, if using Drizzle ORM migrations:

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

### 4. Verify Service Worker Registration

The service worker (`src/service-worker.js`) should already be registered by SvelteKit. Verify it's working:

1. Open your app in browser
2. Open DevTools → Application tab
3. Check "Service Workers" section
4. You should see the service worker registered

### 5. Add Notification Manager to UI

Add the `PushNotificationManager` component to a page where users can enable notifications:

**Option A: User Settings Page**

Create or edit `src/routes/(authenticated)/settings/+page.svelte`:

```svelte
<script>
  import PushNotificationManager from '$lib/components/PushNotificationManager.svelte';
</script>

<div class="p-4">
  <h1>Settings</h1>
  <PushNotificationManager />
</div>
```

**Option B: Newspaper Page**

Edit `src/routes/(authenticated)/(dock)/newspaper/[id]/+page.svelte` to add the component next to the subscribe button.

### 6. Test the Implementation

#### Test Subscription Flow

1. Navigate to a page with `PushNotificationManager`
2. Click "Enable Notifications"
3. Grant permission when prompted
4. Verify in browser DevTools → Application → Service Workers → Push Subscriptions
5. Check database for new entry in `push_subscriptions` table

#### Test Notification Delivery

1. Subscribe to a newspaper
2. Enable push notifications
3. Have someone (or use another account) publish an article in that newspaper
4. You should receive a push notification
5. Click the notification - it should open the article

#### Manual Test via API

Create a test route to send a notification:

```typescript
// src/routes/api/test-notification/+server.ts
import { json } from '@sveltejs/kit';
import { sendPushNotificationToUser } from '$lib/server/services/push-notification.service';

export const POST = async ({ locals }) => {
  const account = locals.account;
  if (!account) return json({ error: 'Unauthorized' }, { status: 401 });

  await sendPushNotificationToUser(account.id, {
    title: 'Test Notification',
    body: 'This is a test!',
    data: { url: '/' }
  });

  return json({ success: true });
};
```

Call it:

```bash
curl -X POST http://localhost:5173/api/test-notification \
  -H "Cookie: your-session-cookie"
```

### 7. Production Deployment

Before deploying to production:

#### Update VAPID Keys

Generate production VAPID keys (different from dev):

```bash
npx web-push generate-vapid-keys
```

#### Set Environment Variables

In your hosting platform (Vercel, etc.):

- Set `VAPID_PUBLIC_KEY`
- Set `VAPID_PRIVATE_KEY`
- Set `VAPID_SUBJECT` (use your production domain email)

#### Verify HTTPS

- Push notifications require HTTPS in production
- Most hosting platforms (Vercel, Netlify) provide this automatically

#### Test on Production

1. Deploy your changes
2. Subscribe to notifications on production
3. Test notification delivery
4. Test on multiple devices/browsers

## Troubleshooting

### Notifications not appearing

**Check browser permissions:**

```javascript
// In browser console
console.log(Notification.permission);
// Should be "granted"
```

**Check service worker:**

```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  console.log('Service worker ready:', reg);
  return reg.pushManager.getSubscription();
}).then(sub => {
  console.log('Push subscription:', sub);
});
```

**Check for errors:**

- Open browser DevTools → Console
- Look for any errors related to service worker or push

### Service worker not updating

Clear service worker cache:

1. DevTools → Application → Service Workers
2. Click "Unregister"
3. Reload page
4. Service worker should re-register with latest code

### Database errors

Verify migration ran successfully:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'push_subscriptions';

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'push_subscriptions';
```

### VAPID key errors

Ensure keys are:

- Properly set in environment variables
- Not committed to git (keep them secret!)
- The same public key used by both server and client

## Security Checklist

- [ ] VAPID private key is in environment variables (not hardcoded)
- [ ] VAPID private key is not in version control
- [ ] Different VAPID keys for dev/staging/production
- [ ] HTTPS enabled in production
- [ ] User authentication required for subscription endpoints
- [ ] Rate limiting on push notification endpoints (optional but recommended)

## Monitoring

### Track Subscription Stats

```sql
-- Total subscriptions
SELECT COUNT(*) FROM push_subscriptions;

-- Subscriptions per user
SELECT user_id, COUNT(*) as device_count 
FROM push_subscriptions 
GROUP BY user_id 
ORDER BY device_count DESC;

-- Recent subscriptions
SELECT * FROM push_subscriptions 
ORDER BY subscribed_at DESC 
LIMIT 10;
```

### Log Push Notification Delivery

Consider adding logging to track:

- Successful sends
- Failed sends
- Removed (410) subscriptions
- Error rates

## Next Steps

After basic setup is working:

1. **Add notification preferences** - Let users choose which newspapers to get notifications from
2. **Implement digest mode** - Send daily/weekly summaries instead of instant notifications
3. **Add rich notifications** - Include article images in notifications
4. **Track engagement** - Monitor notification click-through rates
5. **Optimize timing** - Use user's timezone for better engagement

## Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push library](https://github.com/web-push-libs/web-push)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Protocol](https://tools.ietf.org/html/rfc8292)
