# Push Notifications - Usage Examples

## Adding Push Notification Toggle to Pages

### Example 1: In User Settings

Add the PushNotificationManager component to a user settings or profile page:

```svelte
<!-- src/routes/(authenticated)/settings/notifications/+page.svelte -->
<script lang="ts">
  import PushNotificationManager from '$lib/components/PushNotificationManager.svelte';
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Notification Settings</h1>
  
  <div class="card bg-base-200 p-4">
    <h2 class="text-lg font-semibold mb-2">Push Notifications</h2>
    <p class="text-sm mb-4">
      Get notified when newspapers you're subscribed to publish new articles
    </p>
    
    <PushNotificationManager />
  </div>
</div>
```

### Example 2: In Newspaper Page Header

Add it to the newspaper page so users can enable notifications when they subscribe:

```svelte
<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/+page.svelte -->
<script lang="ts">
  import PushNotificationManager from '$lib/components/PushNotificationManager.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="newspaper-header">
  <h1>{data.newspaper.name}</h1>
  
  {#if data.isSubscribed}
    <div class="flex gap-2 items-center">
      <form method="POST" action="?/unsubscribe">
        <button type="submit" class="btn btn-ghost">
          Unsubscribe
        </button>
      </form>
      
      <!-- Show notification toggle if user is subscribed -->
      <PushNotificationManager />
    </div>
  {:else}
    <form method="POST" action="?/subscribe">
      <button type="submit" class="btn btn-primary">
        Subscribe
      </button>
    </form>
  {/if}
</div>
```

### Example 3: In Main Layout

Add to the main layout navbar for global access:

```svelte
<!-- src/routes/(authenticated)/+layout.svelte -->
<script lang="ts">
  import PushNotificationManager from '$lib/components/PushNotificationManager.svelte';
</script>

<nav class="navbar bg-base-100">
  <div class="flex-1">
    <a class="btn btn-ghost text-xl">PsyOps</a>
  </div>
  <div class="flex-none gap-2">
    <!-- Add notification manager to navbar -->
    <PushNotificationManager />
    
    <!-- Other navbar items -->
    <div class="dropdown dropdown-end">
      <!-- User menu -->
    </div>
  </div>
</nav>
```

## Programmatic Usage

### Subscribe after user subscribes to newspaper

```typescript
// In your newspaper subscription action
export const actions: Actions = {
  subscribe: async ({ locals, params }) => {
    const account = locals.account!;
    const newspaperId = parseInt(params.id);

    // Subscribe to newspaper
    await db.insert(newspaperSubscriptions).values({
      userId: account.id,
      newspaperId
    });

    // Optionally prompt for push notifications
    // This would be handled by the component in the UI
    return { success: true, promptPushNotifications: true };
  }
};
```

### Send test notification

```typescript
// In admin panel or testing route
import { sendPushNotificationToUser } from '$lib/server/services/push-notification.service';

export const POST: RequestHandler = async ({ locals }) => {
  const account = locals.account!;

  await sendPushNotificationToUser(account.id, {
    title: "Test Notification",
    body: "This is a test notification",
    icon: "/favicon.png",
    data: {
      url: "/test"
    }
  });

  return json({ success: true });
};
```

## Client-Side Direct Usage

If you need more control than the component provides:

```typescript
// Subscribe to notifications
async function customSubscribe() {
  const keyResponse = await fetch("/api/push/vapid-public-key");
  const { publicKey } = await keyResponse.json();

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription })
  });
}

// Unsubscribe
async function customUnsubscribe() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
  }
}
```

## Customizing Notification Appearance

### In the service worker (src/service-worker.js)

```javascript
self.addEventListener("push", (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/badge-72.png",
      vibrate: [200, 100, 200], // Vibration pattern
      tag: data.data?.articleId ? `article-${data.data.articleId}` : undefined,
      requireInteraction: false, // Auto-dismiss
      actions: [ // Action buttons (limited browser support)
        { action: 'open', title: 'Read Article' },
        { action: 'close', title: 'Dismiss' }
      ],
      data: data.data
    })
  );
});
```

## Testing

### Test in browser console

```javascript
// Request permission
await Notification.requestPermission();

// Show test notification
new Notification("Test", {
  body: "Testing notifications",
  icon: "/favicon.png"
});

// Check subscription status
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
console.log(subscription);
```

### Send test push from server

```typescript
// Create a test endpoint
// src/routes/api/test-push/+server.ts
import { json } from '@sveltejs/kit';
import { sendPushNotificationToUser } from '$lib/server/services/push-notification.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  const account = locals.account;
  if (!account) return json({ error: 'Unauthorized' }, { status: 401 });

  await sendPushNotificationToUser(account.id, {
    title: '🧪 Test Notification',
    body: 'If you see this, push notifications are working!',
    icon: '/favicon.png',
    data: { url: '/' }
  });

  return json({ success: true });
};
```
