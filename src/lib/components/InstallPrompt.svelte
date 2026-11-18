<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/env";
	import { fly } from "svelte/transition";
	import { backOut } from "svelte/easing";
	import { prefersReducedMotion } from "svelte/motion";
	import FluentDismiss16Filled from "~icons/fluent/dismiss-16-filled";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";

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
	<!-- Floats above the dock (bottom-20) so it never covers the navigation. -->
	<div
		class="fixed bottom-20 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-50 panel rounded-sm p-4 flex items-start gap-3"
		role="dialog"
		aria-label="Install PsyOps"
		in:fly={{ y: 32, duration: prefersReducedMotion.current ? 0 : 380, easing: backOut }}
		out:fly={{ y: 32, duration: prefersReducedMotion.current ? 0 : 160 }}
	>
		<img src="/icon-192.png" alt="" class="size-10 rounded-sm shrink-0" />
		<div class="flex-1 min-w-0">
			<p class="text-sm font-semibold text-[#eef2ff]">Install PsyOps</p>
			{#if deferredPrompt}
				<p class="text-xs text-[#8e9abb] mt-0.5">Add it to your home screen for a faster, full-screen experience.</p>
				<div class="flex gap-2 mt-3">
					<Button size="sm" onclick={install}>Install</Button>
					<Button size="sm" variant="ghost" onclick={dismiss}>Not now</Button>
				</div>
			{:else}
				<p class="text-xs text-[#8e9abb] mt-0.5">
					Tap <span class="font-semibold text-[#c2cbe3]">Share</span>, then
					<span class="font-semibold text-[#c2cbe3]">Add to Home Screen</span>.
				</p>
				<Button size="sm" variant="ghost" class="mt-3" onclick={dismiss}>Got it</Button>
			{/if}
		</div>
		<IconButton icon={FluentDismiss16Filled} label="Dismiss" size="xs" onclick={dismiss} class="-mt-1 -mr-1 shrink-0" />
	</div>
{/if}
