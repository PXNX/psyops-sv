<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/environment";

	let notificationPermission: NotificationPermission = "default";
	let isSubscribed = false;
	let isLoading = false;
	let errorMessage = "";

	// Check notification support and permission on mount
	onMount(async () => {
		if (!browser || !("serviceWorker" in navigator) || !("PushManager" in window)) {
			console.log("Push notifications not supported");
			return;
		}

		notificationPermission = Notification.permission;

		// Check if already subscribed
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			isSubscribed = subscription !== null;
		} catch (error) {
			console.error("Error checking subscription:", error);
		}
	});

	async function requestNotificationPermission() {
		if (!("Notification" in window)) {
			errorMessage = "Notifications are not supported by your browser";
			return;
		}

		try {
			const permission = await Notification.requestPermission();
			notificationPermission = permission;

			if (permission === "granted") {
				await subscribeToPushNotifications();
			} else {
				errorMessage = "Notification permission denied";
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
			errorMessage = "Failed to subscribe to notifications";
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
	function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

<div class="push-notification-manager">
	{#if notificationPermission === "default"}
		<button
			class="btn btn-primary btn-sm"
			onclick={requestNotificationPermission}
			disabled={isLoading}
		>
			{#if isLoading}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				🔔 Enable Notifications
			{/if}
		</button>
	{:else if notificationPermission === "granted"}
		{#if isSubscribed}
			<button
				class="btn btn-ghost btn-sm"
				onclick={unsubscribeFromPushNotifications}
				disabled={isLoading}
			>
				{#if isLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					🔕 Disable Notifications
				{/if}
			</button>
		{:else}
			<button
				class="btn btn-primary btn-sm"
				onclick={subscribeToPushNotifications}
				disabled={isLoading}
			>
				{#if isLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					🔔 Enable Notifications
				{/if}
			</button>
		{/if}
	{:else if notificationPermission === "denied"}
		<div class="text-sm text-error">
			Notifications blocked. Please enable them in your browser settings.
		</div>
	{/if}

	{#if errorMessage}
		<div class="text-sm text-error mt-2">{errorMessage}</div>
	{/if}
</div>

<style>
	.push-notification-manager {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
