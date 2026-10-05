<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/env";

	const DISMISSED_KEY = "psyops:install-prompt-dismissed";

	interface BeforeInstallPromptEvent extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
	}

	let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let iosHint = $state(false);
	let dismissed = $state(false);

	const visible = $derived(!dismissed && (deferredPrompt !== null || iosHint));

	function isStandalone(): boolean {
		return (
			window.matchMedia("(display-mode: standalone)").matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true
		);
	}

	onMount(() => {
		if (!browser || isStandalone()) return;

		dismissed = localStorage.getItem(DISMISSED_KEY) === "1";

		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			deferredPrompt = event as BeforeInstallPromptEvent;
		};
		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

		const onInstalled = () => {
			deferredPrompt = null;
			dismissed = true;
		};
		window.addEventListener("appinstalled", onInstalled);

		// iOS Safari never fires beforeinstallprompt; fall back to a manual hint.
		const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
		const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
		if (isIos && isSafari) {
			iosHint = true;
		}

		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
			window.removeEventListener("appinstalled", onInstalled);
		};
	});

	async function install() {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		await deferredPrompt.userChoice;
		deferredPrompt = null;
	}

	function dismiss() {
		dismissed = true;
		localStorage.setItem(DISMISSED_KEY, "1");
	}
</script>

{#if visible}
	<div
		class="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-50 panel rounded-xl p-4 shadow-lg flex items-start gap-3"
	>
		<img src="/icon-192.png" alt="" class="size-10 rounded-lg shrink-0" />
		<div class="flex-1 min-w-0">
			<p class="text-sm font-semibold text-[#fff7e8]">Install PsyOps</p>
			{#if deferredPrompt}
				<p class="text-xs text-[#a89e8e] mt-0.5">Add it to your home screen for a faster, full-screen experience.</p>
				<div class="flex gap-2 mt-3">
					<button
						onclick={install}
						class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#e6a527] text-[#172a45] hover:brightness-110 transition"
					>
						Install
					</button>
					<button
						onclick={dismiss}
						class="px-3 py-1.5 rounded-lg text-xs font-medium text-[#a89e8e] hover:text-[#fff7e8] transition-colors"
					>
						Not now
					</button>
				</div>
			{:else}
				<p class="text-xs text-[#a89e8e] mt-0.5">
					Tap <span class="font-semibold text-[#d9ccb7]">Share</span>, then
					<span class="font-semibold text-[#d9ccb7]">Add to Home Screen</span>.
				</p>
				<button
					onclick={dismiss}
					class="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-[#a89e8e] hover:text-[#fff7e8] transition-colors"
				>
					Got it
				</button>
			{/if}
		</div>
		<button
			onclick={dismiss}
			aria-label="Dismiss"
			class="text-[#a89e8e] hover:text-[#fff7e8] transition-colors shrink-0"
		>
			✕
		</button>
	</div>
{/if}
