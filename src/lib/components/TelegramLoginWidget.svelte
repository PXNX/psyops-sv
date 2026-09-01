<!--
	Embeds Telegram's official Login Widget (telegram-widget.js) instead of
	linking to oauth.telegram.org/tg/start directly. That raw redirect endpoint
	is undocumented and only works reliably when the browser already has an
	active web.telegram.org session; the widget handles the auth popup itself
	and is Telegram's supported integration path.

	On success it POSTs the signed user data to /auth/callback/telegram (which
	verifies it the same way as the GET/widget-redirect flow) and navigates to
	`next` on success for existing users, or the server's own onboarding
	redirect for brand new accounts.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { browser } from "$app/environment";
	import { env } from "$env/dynamic/public";

	let {
		next = "/",
		size = "large",
		class: className = ""
	}: {
		next?: string;
		size?: "large" | "medium" | "small";
		class?: string;
	} = $props();

	let container: HTMLDivElement;
	let error = $state<string | null>(null);

	const botUsername = env.PUBLIC_TELEGRAM_BOT_USERNAME || "RW_SupportBot";
	const callbackName = `tgLoginCallback_${Math.random().toString(36).slice(2)}`;

	onMount(() => {
		if (!browser) return;

		(window as any)[callbackName] = async (user: Record<string, unknown>) => {
			error = null;
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
		};

		const script = document.createElement("script");
		script.src = "https://telegram.org/js/telegram-widget.js?22";
		script.async = true;
		script.setAttribute("data-telegram-login", botUsername);
		script.setAttribute("data-size", size);
		script.setAttribute("data-radius", "8");
		script.setAttribute("data-onauth", `${callbackName}(user)`);
		script.setAttribute("data-request-access", "write");
		container.appendChild(script);

		return () => {
			delete (window as any)[callbackName];
		};
	});
</script>

<div bind:this={container} class={className}></div>
{#if error}
	<p class="text-sm text-error mt-2">{error}</p>
{/if}
