<!--
	Custom-styled "Log in with Telegram" button, driven by Telegram's widget
	script but *not* its default inline iframe button (which can't be
	restyled to match the site). telegram-widget.js exposes
	`Telegram.Login.auth(options, callback)` for exactly this: our own
	button's onclick opens the same oauth.telegram.org popup Telegram's own
	button would, and calls back with the signed user data once the user
	authorizes.

	The raw redirect to oauth.telegram.org/tg/start (the previous approach)
	is intentionally not used — it's an undocumented endpoint that only works
	with an active web.telegram.org session and otherwise dumps the user on
	Telegram's generic docs page.

	On success the signed user data is POSTed to /auth/callback/telegram
	(verified there the same way), then navigates to `next` for existing
	users, or the server's own onboarding redirect for brand new accounts.
-->
<script lang="ts">
	import { goto } from "$app/navigation";
	import { browser } from "$app/environment";
	import { env } from "$env/dynamic/public";

	let {
		next = "/",
		label = "Sign up with Telegram",
		class: className = ""
	}: {
		next?: string;
		label?: string;
		class?: string;
	} = $props();

	let error = $state<string | null>(null);
	let scriptLoaded = $state(false);
	let pending = $state(false);

	const botId = env.PUBLIC_TELEGRAM_BOT_ID || "";

	function loadScript(): Promise<void> {
		if (!browser) return Promise.resolve();
		const w = window as any;
		if (w.Telegram?.Login) return Promise.resolve();
		if (w.__telegramWidgetLoading) return w.__telegramWidgetLoading;

		w.__telegramWidgetLoading = new Promise<void>((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "https://telegram.org/js/telegram-widget.js?22";
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error("Failed to load Telegram widget script"));
			document.head.appendChild(script);
		});
		return w.__telegramWidgetLoading;
	}

	async function login() {
		error = null;
		if (!botId) {
			error = "Telegram login is not configured.";
			return;
		}

		pending = true;
		try {
			await loadScript();
			scriptLoaded = true;
		} catch (err) {
			console.error("Telegram widget script failed to load:", err);
			error = "Couldn't load Telegram login, please try again.";
			pending = false;
			return;
		}

		const Telegram = (window as any).Telegram;
		if (!Telegram?.Login) {
			error = "Telegram login isn't ready yet, please try again in a moment.";
			pending = false;
			return;
		}

		Telegram.Login.auth({ bot_id: botId, request_access: "write" }, async (user: Record<string, unknown> | false) => {
			pending = false;
			if (!user) {
				// User closed the popup or declined — not an error worth surfacing.
				return;
			}
			try {
				const res = await fetch("/auth/callback/telegram", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ user, hash: user.hash, auth_date: user.auth_date })
				});
				const result = await res.json();
				if (!res.ok || !result.success) {
					error = result.error || "Telegram login failed. Please try again.";
					return;
				}
				await goto(result.isNewUser ? result.redirectTo : next);
			} catch (err) {
				console.error("Telegram widget login error:", err);
				error = "Something went wrong, please try again.";
			}
		});
	}
</script>

<button
	type="button"
	onclick={login}
	disabled={pending}
	class="btn btn-lg w-full gap-3 bg-[#24A1DE] hover:bg-[#2094cc] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 {className}"
>
	<svg class="size-6" fill="currentColor" viewBox="0 0 24 24">
		<path
			d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295-.042 0-.084 0-.126-.01l.21-3.051 5.56-5.023c.242-.213-.054-.328-.373-.115L6.765 13.08l-2.994-.924c-.651-.204-.666-.651.136-.968l11.708-4.514c.54-.203 1.01.122.84.953z"
		/>
	</svg>
	<span class="font-semibold">{pending ? "Waiting for Telegram…" : label}</span>
</button>
{#if error}
	<p class="text-sm text-error mt-2">{error}</p>
{/if}
