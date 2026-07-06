/// <reference types="@sveltejs/kit" />
import { build, files, version } from "$service-worker";

// Versioned caches so a new deployment starts clean and old data is purged.
const PRECACHE = `precache-${version}`; // immutable app build + static files
const RUNTIME = `runtime-${version}`; // runtime assets (images, fonts, etc.)

// Custom page served when a navigation fails and we have no cached copy.
const OFFLINE_URL = "/offline.html";

const ASSETS = [
	...build, // the app itself
	...files // everything in `static` (includes OFFLINE_URL)
];
const ASSET_SET = new Set(ASSETS);

self.addEventListener("install", (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(PRECACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener("activate", (event) => {
	async function activate() {
		// Remove caches from previous deployments
		for (const key of await caches.keys()) {
			if (key !== PRECACHE && key !== RUNTIME) {
				await caches.delete(key);
			}
		}

		// Speed up network-first navigations by letting the browser start the
		// request while the service worker boots up.
		if (self.registration.navigationPreload) {
			await self.registration.navigationPreload.enable();
		}

		await self.clients.claim();
	}

	event.waitUntil(activate());
});

// Runtime asset destinations that are safe to serve cache-first: they are
// large, rarely change, and instant loading makes the app feel snappier.
const CACHEABLE_DESTINATIONS = new Set(["image", "font", "audio", "video"]);

function isCacheableResponse(response) {
	// Only cache complete, successful responses. Opaque (status 0) responses are
	// still worth caching for cross-origin assets like fonts/images.
	return response instanceof Response && (response.status === 200 || response.type === "opaque");
}

// Serve from cache immediately, then refresh the cache in the background.
async function staleWhileRevalidate(event) {
	const cache = await caches.open(RUNTIME);
	const cached = await cache.match(event.request);

	const network = fetch(event.request)
		.then((response) => {
			if (isCacheableResponse(response)) {
				cache.put(event.request, response.clone());
			}
			return response;
		})
		.catch(() => undefined);

	if (cached) {
		// Keep the cache warm without blocking the response.
		event.waitUntil(network);
		return cached;
	}

	const response = await network;
	if (response) {
		return response;
	}
	throw new Error("network and cache both unavailable");
}

// Try the network first, fall back to the cache when offline.
async function networkFirst(event, { preloadResponse } = {}) {
	const cache = await caches.open(RUNTIME);

	try {
		const response = (await preloadResponse) || (await fetch(event.request));

		// if we're offline, fetch can return a value that is not a Response
		// instead of throwing - and we can't pass this non-Response to respondWith
		if (!(response instanceof Response)) {
			throw new Error("invalid response from fetch");
		}

		if (response.status === 200) {
			cache.put(event.request, response.clone());
		}

		return response;
	} catch (err) {
		const response = await cache.match(event.request);
		if (response) {
			return response;
		}
		throw err;
	}
}

self.addEventListener("fetch", (event) => {
	// ignore POST requests etc
	if (event.request.method !== "GET") {
		return;
	}

	const url = new URL(event.request.url);
	const isSameOrigin = url.origin === self.location.origin;

	// `build`/`files` are content-hashed and immutable: always cache-first.
	if (isSameOrigin && ASSET_SET.has(url.pathname)) {
		event.respondWith(
			caches.open(PRECACHE).then((cache) => cache.match(url.pathname).then((r) => r || fetch(event.request)))
		);
		return;
	}

	// Images/fonts and other heavy static assets: stale-while-revalidate.
	if (CACHEABLE_DESTINATIONS.has(event.request.destination)) {
		event.respondWith(staleWhileRevalidate(event));
		return;
	}

	// Never cache API calls or other dynamic same-origin endpoints beyond the
	// network-first fallback; let them hit the network directly when possible.
	if (isSameOrigin && url.pathname.startsWith("/api/")) {
		return;
	}

	// Navigations and remaining same-origin GETs: network-first with an offline
	// cache fallback so previously visited pages still work without a connection.
	if (event.request.mode === "navigate" || isSameOrigin) {
		event.respondWith(
			networkFirst(event, { preloadResponse: event.preloadResponse }).catch(async (err) => {
				// When neither the network nor the runtime cache can serve a page
				// navigation, show the custom offline page instead of the browser's
				// default "no internet" screen.
				if (event.request.mode === "navigate") {
					const offline = await caches.match(OFFLINE_URL);
					if (offline) {
						return offline;
					}
				}
				throw err;
			})
		);
	}
});

// Handle push notifications
self.addEventListener("push", (event) => {
	let notificationData = {
		title: "New Notification",
		body: "You have a new notification",
		icon: "/favicon.png",
		badge: "/badge.png",
		data: {}
	};

	if (event.data) {
		try {
			notificationData = event.data.json();
		} catch (error) {
			console.error("Error parsing push notification:", error);
		}
	}

	event.waitUntil(
		self.registration.showNotification(notificationData.title, {
			body: notificationData.body,
			icon: notificationData.icon || "/favicon.png",
			badge: notificationData.badge || "/badge.png",
			data: notificationData.data,
			tag:
				notificationData.data?.tag ??
				(notificationData.data?.articleId ? `article-${notificationData.data.articleId}` : undefined),
			renotify: true,
			requireInteraction: false
		})
	);
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	// Get the URL to open (default to home page)
	const urlToOpen = event.notification.data?.url || "/";

	event.waitUntil(
		clients
			.matchAll({
				type: "window",
				includeUncontrolled: true
			})
			.then((clientList) => {
				// Check if there's already a window open
				for (const client of clientList) {
					if (client.url === urlToOpen && "focus" in client) {
						return client.focus();
					}
				}
				// If no window is open, open a new one
				if (clients.openWindow) {
					return clients.openWindow(urlToOpen);
				}
			})
	);
});
