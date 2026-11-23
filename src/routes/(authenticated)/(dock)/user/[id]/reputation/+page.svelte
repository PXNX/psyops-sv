<!-- src/routes/(authenticated)/(dock)/user/[id]/reputation/+page.svelte -->
<!-- Why the profile shows that reputation number: it is civilian opinion in
     the player's current region, built from services, patronage and losses. -->
<script lang="ts">
	import FluentHeart20Filled from "~icons/fluent/heart-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { BackLink } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.user.name || "User"} · Reputation · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="3xl">
	<header class="space-y-3">
		<BackLink href="/user/{data.user.id}" label={data.user.name || "Profile"} class="-ml-3" />
		<div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
			<UserLink id={data.user.id} name={data.user.name} avatar={data.user.logo} size="md" />
			<div class="text-right">
				<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Reputation</p>
				<p class="font-mono text-2xl font-bold text-primary-fg">{data.reputation ?? "—"}</p>
			</div>
		</div>
	</header>

	<section class="panel rounded-sm p-4 sm:p-5 space-y-3">
		<h2 class="section-title">Where it comes from</h2>
		<p class="text-sm text-fg-body">
			Reputation is not a personal score — it is how the civilians of your current region feel, on a
			0–100 scale. State services and completed civic buildings raise it; fortifications, civilian
			casualties and shortages pull it down. Move to another region and it changes with the locals you
			live among.
		</p>
		{#if data.region}
			<a
				href="/region/{data.region.id}"
				class="flex items-center gap-3 rounded-sm border border-line/20 bg-surface-2/40 p-3 text-sm hover:border-primary/40"
			>
				<FluentHome20Filled class="size-5 shrink-0 text-primary-fg" />
				<span class="min-w-0 flex-1">
					<strong class="block truncate text-fg">{data.region.name}</strong>
					<span class="text-xs text-fg-muted">
						region #{data.region.id}{data.region.since ? ` · resident since ${formatDate(data.region.since)}` : ""}
						{#if data.region.homeRegionId && data.region.homeRegionId !== data.region.id}
							· citizenship in region #{data.region.homeRegionId}
						{/if}
					</span>
				</span>
				<span class="font-mono text-lg font-bold text-fg">{data.reputation ?? "—"}</span>
			</a>
		{:else}
			<p class="text-sm text-fg-muted">This player has no residence region, so there is no local reputation to show.</p>
		{/if}
	</section>

	{#if data.components.length}
		<section class="panel rounded-sm p-4 sm:p-5 space-y-3">
			<h2 class="section-title">The arithmetic</h2>
			<div class="rounded-sm border border-line/20">
				<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted">
					<span>Factor</span><span class="text-right">Basis</span><span class="text-right">Points</span>
				</div>
				{#each data.components as component (component.key)}
					<div class="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm last:border-0">
						<span class="text-fg">{component.label}</span>
						<span class="text-right font-mono text-xs text-fg-muted">{component.detail}</span>
						<span class="text-right font-mono {component.points < 0 ? 'text-red-300' : 'text-positive-fg'}">
							{component.points > 0 ? "+" : ""}{component.points}
						</span>
					</div>
				{/each}
				<div class="flex justify-between bg-primary/10 px-3 py-2 text-sm font-semibold text-fg">
					<span class="flex items-center gap-2"><FluentHeart20Filled class="size-4" /> Reputation</span>
					<span class="font-mono">{data.reputation ?? "—"}</span>
				</div>
			</div>
			<p class="text-xs text-fg-muted">The total is clamped to the 0–100 scale after all factors are added.</p>
		</section>
	{/if}

	<section class="panel rounded-sm p-4 sm:p-5 space-y-3">
		<h2 class="section-title">Your contribution</h2>
		{#if data.ownProjects.length}
			<ul class="divide-y divide-line/10">
				{#each data.ownProjects as project (project.id)}
					<li class="flex items-center justify-between gap-3 py-2 text-sm">
						<span class="min-w-0 truncate text-fg">{project.icon} {project.name}</span>
						<span class="shrink-0 font-mono text-fg-soft">+{project.goodwill} · {formatDate(project.completedAt)}</span>
					</li>
				{/each}
			</ul>
			<p class="text-xs text-fg-muted">
				Your completed buildings here add <span class="font-mono text-positive-fg">+{data.ownGoodwill}</span>
				to the region's opinion, which this reputation reflects. Other players' buildings count too.
			</p>
		{:else}
			<EmptyState
				title="No civic buildings completed here yet"
				subtitle="Funding a water works, clinic or school in this region is one way to win the locals over."
			/>
		{/if}
	</section>
</PageContainer>
