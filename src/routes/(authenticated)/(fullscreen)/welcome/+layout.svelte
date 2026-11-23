<!-- src/routes/(authenticated)/(fullscreen)/welcome/+layout.svelte -->
<script lang="ts">
	import { page } from "$app/state";
	import { fade } from "svelte/transition";
	const { children } = $props();
	const step: Record<string, string> = {
		"/welcome": "The will",
		"/welcome/create": "Your name",
		"/welcome/region": "Your place"
	};
</script>

<svelte:head>
	<title>PsyOps | An Inheritance</title>
</svelte:head>

<div class="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-8">
	<!-- Quiet moving backdrop: a paper-like field with drifting ink marks. -->
	<div class="welcome-field pointer-events-none absolute inset-0" aria-hidden="true">
		<span class="ink ink-a"></span>
		<span class="ink ink-b"></span>
		<span class="ink ink-c"></span>
		<span class="ink ink-d"></span>
	</div>
	<div class="relative z-10 flex w-full flex-col items-center space-y-4">
		{#key page.url.pathname}
			<div in:fade={{ duration: 260 }}>
				<div class="font-mono text-[10px] uppercase tracking-[0.28em] text-fg-muted">
					{step[page.url.pathname] ?? "A new beginning"}
				</div>
			</div>
		{/key}
		{@render children()}
	</div>
</div>

<style>
	.welcome-field {
		background:
			radial-gradient(circle at 20% 15%, color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 45%),
			radial-gradient(circle at 85% 80%, color-mix(in oklab, var(--color-positive) 8%, transparent), transparent 40%);
	}
	.ink {
		position: absolute;
		border-radius: 9999px;
		filter: blur(38px);
		opacity: 0.28;
		animation: ink-drift 18s ease-in-out infinite;
	}
	.ink-a {
		inset: -8% auto auto 8%;
		width: 22rem;
		height: 22rem;
		background: var(--color-primary);
	}
	.ink-b {
		inset: 10% 4% auto auto;
		width: 18rem;
		height: 18rem;
		background: var(--color-politics);
		animation-delay: -5s;
	}
	.ink-c {
		inset: auto auto 2% 18%;
		width: 24rem;
		height: 24rem;
		background: var(--color-positive);
		animation-delay: -9s;
	}
	.ink-d {
		inset: auto 8% 12% auto;
		width: 14rem;
		height: 14rem;
		background: var(--color-warning);
		animation-delay: -13s;
	}
	@keyframes ink-drift {
		0%,
		100% {
			transform: translate3d(0, 0, 0) scale(1);
		}
		50% {
			transform: translate3d(2rem, -1.5rem, 0) scale(1.12);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ink {
			animation: none;
		}
	}
</style>
