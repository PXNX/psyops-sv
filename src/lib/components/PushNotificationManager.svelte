<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/env";

	let notificationPermission = $state<NotificationPermission>("default");
	let isSubscribed = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state("");

	// Check notification support and permission on mount
	onMount(() => {
		if (!browser) return;

		// Browsers silently auto-deny permission prompts on insecure origins
		// (e.g. the dev server opened via a LAN IP over plain http).
		if (!window.isSecureContext) {
			errorMessage = "Notifications require HTTPS (or localhost)";
			return;
		}

		if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
			errorMessage = "Push notifications are not supported by this browser";
			return;
		}

		notificationPermission = Notification.permission;

		// Keep the permission in sync when the user changes it in the browser's
		// site settings, so unblocking doesn't require a reload.
		const syncPermission = () => {
			notificationPermission = Notification.permission;
			if (notificationPermission !== "denied") errorMessage = "";
		};
		document.addEventListener("visibilitychange", syncPermission);
		let permissionStatus: PermissionStatus | undefined;
		navigator.permissions
			?.query({ name: "notifications" })
			.then((status) => {
				permissionStatus = status;
				status.onchange = syncPermission;
			})
			.catch(() => {});

		// Check if already subscribed
		navigator.serviceWorker.ready
			.then((registration) => registration.pushManager.getSubscription())
			.then((subscription) => {
				isSubscribed = subscription !== null;
			})
			.catch((error) => console.error("Error checking subscription:", error));

		return () => {
			document.removeEventListener("visibilitychange", syncPermission);
			if (permissionStatus) permissionStatus.onchange = null;
		};
	});

	async function requestNotificationPermission(event: Event) {
		// The toggle only starts the flow; its visual state follows the result.
		(event.currentTarget as HTMLInputElement).checked = false;
		errorMessage = "";

		if (!("Notification" in window)) {
			errorMessage = "Notifications are not supported by your browser";
			return;
		}

		try {
			// Must run before any other await so it stays inside the user
			// gesture; otherwise browsers treat it as unsolicited and auto-block.
			const permission = await Notification.requestPermission();
			notificationPermission = permission;

			if (permission === "granted") {
				await subscribeToPushNotifications();
			} else if (permission === "default") {
				// Dismissing the prompt is not a denial — let the user retry.
				errorMessage = "Permission prompt was dismissed — try again and choose Allow";
			}
		} catch (error) {
			console.error("Error requesting permission:", error);
			errorMessage = "Failed to request permission";
		}
	}

	async function subscribeToPushNotifications() {
		if (!browser || !("serviceWorker" in navigator)) {
			return;
		}

		isLoading = true;
		errorMessage = "";

		try {
			// Get VAPID public key from server
			const keyResponse = await fetch("/api/push/vapid-public-key");
			const { publicKey } = await keyResponse.json();
			if (!keyResponse.ok || !publicKey) {
				throw new Error("push is not configured on the server");
			}

			// Wait for service worker to be ready
			const registration = await navigator.serviceWorker.ready;

			// Subscribe to push notifications
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey)
			});

			// Send subscription to server
			const response = await fetch("/api/push/subscribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ subscription })
			});

			if (!response.ok) {
				throw new Error("Failed to save subscription");
			}

			isSubscribed = true;
			console.log("Successfully subscribed to push notifications");
		} catch (error) {
			console.error("Error subscribing to push notifications:", error);
			// Surface the real reason, e.g. Brave's disabled push service
			// ("Registration failed - push service error").
			errorMessage = `Failed to subscribe: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			isLoading = false;
		}
	}

	async function unsubscribeFromPushNotifications() {
		if (!browser || !("serviceWorker" in navigator)) {
			return;
		}

		isLoading = true;
		errorMessage = "";

		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();

			if (subscription) {
				// Unsubscribe from push manager
				await subscription.unsubscribe();

				// Remove from server
				await fetch("/api/push/unsubscribe", {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ endpoint: subscription.endpoint })
				});

				isSubscribed = false;
				console.log("Successfully unsubscribed from push notifications");
			}
		} catch (error) {
			console.error("Error unsubscribing from push notifications:", error);
			errorMessage = "Failed to unsubscribe";
		} finally {
			isLoading = false;
		}
	}

	// Helper function to convert base64 to Uint8Array
	function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
		const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}
</script>

<div class="flex items-center justify-between gap-3 py-2.5">
	<div class="flex items-center gap-3">
		<span class="text-lg">📲</span>
		<div>
			<p class="text-sm font-medium text-[#d9ccb7]">Push Notifications</p>
			<p class="text-xs text-[#a89e8e]">
				{#if notificationPermission === "denied"}
					Blocked — enable them in your browser's site settings
				{:else if notificationPermission === "granted" && isSubscribed}
					Enabled on this device
				{:else}
					Required for any of the notifications below to reach you
				{/if}
			</p>
		</div>
	</div>

	{#if notificationPermission === "denied"}
		<span class="text-xs text-red-400 font-medium">Blocked</span>
	{:else if notificationPermission === "granted" && isSubscribed}
		<button
			class="text-xs font-medium text-[#a89e8e] hover:text-[#fff7e8] transition-colors disabled:opacity-50"
			onclick={unsubscribeFromPushNotifications}
			disabled={isLoading}
		>
			{isLoading ? "…" : "Disable"}
		</button>
	{:else}
		<input
			type="checkbox"
			checked={false}
			disabled={isLoading}
			onchange={requestNotificationPermission}
			class="toggle toggle-info"
		/>
	{/if}
</div>

{#if errorMessage}
	<p class="text-xs text-red-400 mt-1">{errorMessage}</p>
{/if}
