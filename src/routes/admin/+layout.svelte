<script lang="ts">
	import type { Snippet } from "svelte";
	import { page } from "$app/state";
	import FluentGrid20Filled from "~icons/fluent/grid-20-filled";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentShieldLock20Filled from "~icons/fluent/shield-lock-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";

	let { children, data }: { children: Snippet; data: any } = $props();

	const links = [
		{ href: "/admin", label: "Overview", icon: FluentGrid20Filled, badge: 0 },
		{ href: "/admin/users", label: "Users & roles", icon: FluentPeople20Filled, badge: 0 },
		{ href: "/admin/flags", label: "Content flags", icon: FluentFlag20Filled, badge: 0 },
		{ href: "/admin/broadcast", label: "Broadcast", icon: FluentMegaphone20Filled, badge: 0 },
		{ href: "/admin/giftcode", label: "Gift codes", icon: FluentGift20Filled, badge: 0 }
	];

	const navItems = $derived(
		links.map((link) => ({
			...link,
			badge: link.href === "/admin/flags" ? data.pendingFlags : 0
		}))
	);

	const isActive = (href: string) => (href === "/admin" ? page.url.pathname === "/admin" : page.url.pathname.startsWith(href));
</script>

<svelte:head><title>Admin · PsyOps</title></svelte:head>

<div class="bg-primary/8 border-b border-line/15">
	<PageContainer maxWidth="6xl">
		<div class="flex items-center gap-2 py-3 flex-wrap">
			<FluentShieldLock20Filled class="size-5 text-primary-fg mr-1" />
			{#each navItems as link}
				<a
					href={link.href}
					class="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors {isActive(link.href)
						? 'bg-primary/20 text-primary-fg border border-primary/40'
						: 'text-fg-muted hover:text-fg hover:bg-surface-5/60 border border-transparent'}"
				>
					<link.icon class="size-4" />
					{link.label}
					{#if link.badge > 0}
						<span class="badge badge-xs rounded-sm bg-red-600/20 text-red-300 border border-red-500/30">{link.badge}</span>
					{/if}
				</a>
			{/each}
		</div>
	</PageContainer>
</div>

{@render children()}
