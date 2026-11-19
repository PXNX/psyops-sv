<!-- src/routes/(authenticated)/(dock)/war/[id]/+page.svelte -->
<!-- A war as a front dispatch: belligerents, a stamped status, the
     exhaustion gauge, front line, engagements and order of battle. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { onMount } from "svelte";
	import { formatDateTime, getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { StrikeLog } from "#lib/component/strike/index.js";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";

	const { data } = $props();

	type Side = "attacker" | "defender";
	const SIDE = {
		attacker: { label: "Attackers", text: "text-red-300", ring: "border-red-500/50" },
		defender: { label: "Defenders", text: "text-friendly-fg", ring: "border-friendly/50" }
	} as const;

	let now = $state(Date.now());
	onMount(() => {
		const t = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(t);
	});
	const duration = $derived.by(() => {
		const end = data.war.endedAt ? new Date(data.war.endedAt).getTime() : now;
		const mins = Math.max(0, Math.floor((end - new Date(data.war.declaredAt).getTime()) / 60_000));
		const d = Math.floor(mins / 1440);
		const h = Math.floor((mins % 1440) / 60);
		return d > 0 ? `${d}d ${h}h` : `${h}h ${mins % 60}m`;
	});

	const ongoing = $derived(data.battles.filter((b) => b.status === "ongoing"));
	const finished = $derived(data.battles.filter((b) => b.status !== "ongoing"));
	const exhaustionPct = $derived(Math.min(100, (data.war.exhaustion / data.war.exhaustionLimit) * 100));
	const main = (side: Side) => data[side].states.find((s) => s.isMain) ?? data[side].states[0];
	const active = $derived(data.war.status === "active");

	let surrendering = $state(false);
</script>

<svelte:head>
	<title>{`${main("attacker")?.name ?? "War"} vs ${main("defender")?.name ?? ""} · PsyOps`}</title>
</svelte:head>

{#snippet belligerent(side: Side)}
	{@const s = main(side)}
	<a href="/state/{s?.id}" class="group flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
		<Logo
			src={s?.logo}
			alt={s?.name ?? ""}
			class="size-16 rounded-sm border-2 sm:size-20 transition-transform group-hover:-translate-y-0.5 {SIDE[side].ring}"
			placeholderIcon={FluentBuildingGovernment20Filled}
			placeholderGradient={side === "attacker" ? "from-red-700 to-red-900" : "from-friendly-bg to-friendly-deep"}
		/>
		<div class="min-w-0">
			<p class="text-[10px] font-semibold uppercase tracking-[0.2em] {SIDE[side].text}">{SIDE[side].label}</p>
			<p class="line-clamp-2 font-serif text-lg font-bold leading-tight text-fg group-hover:text-primary-hover">
				{s?.name}
			</p>
			{#if data[side].bloc}
				<p class="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-fg-muted">
					<span class="size-2 rounded-full" style:background={data[side].bloc!.color}></span>
					{data[side].bloc!.name}
				</p>
			{/if}
		</div>
	</a>
{/snippet}

{#snippet battleRow(b: (typeof data.battles)[number])}
	{@const won = b.status === "attacker_won" ? "attacker" : b.status === "defender_won" ? "defender" : null}
	<li>
		<a href="/battle/{b.id}" class="panel-interactive flex items-center gap-3 rounded-sm p-3">
			<img src={regionCoatUrl(b.regionId)} alt="" class="size-10 shrink-0 object-contain" />
			<div class="min-w-0 flex-1">
				<p class="truncate font-semibold text-fg">Battle of {getRegionName(b.regionId)}</p>
				<p class="truncate text-xs text-fg-muted">
					<span class="text-red-300">{b.attackerName}</span> → <span class="text-friendly-fg">{b.defenderName}</span>
					· <span class="font-mono">{formatDateTime(b.startedAt)}</span>
				</p>
			</div>
			{#if won}
				<span
					class="shrink-0 animate-stamp rounded-sm border-2 px-2 py-0.5 font-serif text-[11px] font-black uppercase tracking-widest {won ===
					'attacker'
						? 'border-red-500/60 text-red-300'
						: 'border-friendly/60 text-friendly-fg'}"
					style="--stamp-tilt: -5deg"
				>
					{won === "attacker" ? "Taken" : "Held"}
				</span>
			{:else if b.phase === "active"}
				<span class="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-300">
					<span class="size-1.5 rounded-full bg-red-500 animate-pulse"></span>Fighting
				</span>
			{:else}
				<Badge tone="amber" size="xs">Preparing</Badge>
			{/if}
		</a>
	</li>
{/snippet}

<PageContainer maxWidth="5xl">
	<!-- Dispatch header -->
	<article class="panel relative overflow-hidden rounded-sm">
		<div
			class="flex items-center justify-between gap-3 border-b border-line/15 bg-surface-4/70 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-fg-muted"
		>
			<span>Situation report</span>
			<span class="font-mono">War No. {data.war.id}</span>
		</div>

		<div class="space-y-5 p-5">
			<div class="relative flex items-start gap-3">
				{@render belligerent("attacker")}
				<div class="flex shrink-0 flex-col items-center gap-2 pt-6">
					<span class="font-serif text-xl font-black italic text-fg-muted">vs</span>
				</div>
				{@render belligerent("defender")}
			</div>

			<div class="flex justify-center">
				<span
					class="animate-stamp rounded-sm border-2 border-double px-3 py-1 font-serif text-sm font-black uppercase tracking-[0.25em] {active
						? 'border-red-500/70 text-red-300'
						: 'border-line/60 text-fg-body'}"
					style="--stamp-tilt: -4deg"
				>
					{active ? "At war" : (data.war.endedReason ?? "Ended")}
				</span>
			</div>

			<p
				class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-y border-line/15 py-2 text-xs text-fg-muted"
			>
				<span>Declared <span class="font-mono text-fg-soft">{formatDateTime(data.war.declaredAt)}</span></span>
				{#if data.war.declaredBy}
					<span class="inline-flex items-center gap-1"
						>by <UserLink
							size="xs"
							id={data.war.declaredBy.id}
							name={data.war.declaredBy.name}
							avatar={data.war.declaredBy.avatar}
						/></span
					>
				{/if}
				<span aria-hidden="true">·</span>
				<span>{active ? "Day" : "Lasted"} <span class="font-mono text-fg-soft">{duration}</span></span>
				{#if !active && data.war.endedAt}
					<span aria-hidden="true">·</span>
					<span>Ended <span class="font-mono text-fg-soft">{formatDateTime(data.war.endedAt)}</span></span>
					{#if data.war.surrenderedByName}<span>· {data.war.surrenderedByName} gave up</span>{/if}
				{/if}
			</p>

			{#if active}
				<div>
					<div class="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-fg-muted">
						<span>War exhaustion</span>
						<span class="font-mono text-fg-body">{data.war.exhaustion} / {data.war.exhaustionLimit}</span>
					</div>
					<div class="relative h-2.5 overflow-hidden rounded-full bg-surface-0">
						<div
							class="h-full rounded-full transition-[width] duration-700 {exhaustionPct > 80
								? 'bg-red-500'
								: 'bg-primary'}"
							style:width="{exhaustionPct}%"
						></div>
						{#each [25, 50, 75] as tick (tick)}
							<span class="absolute inset-y-0 w-px bg-surface-1/80" style:left="{tick}%"></span>
						{/each}
					</div>
					<p class="mt-1 text-right text-[10px] text-fg-muted">
						White peace at {data.war.exhaustionLimit} or after {data.war.stalemateDays} quiet days
					</p>
				</div>
			{/if}

			<!-- Tally -->
			<div class="grid grid-cols-3 gap-2 text-center">
				{#each [["Battles won", data.attacker.battlesWon, data.defender.battlesWon], ["Regions held", data.attacker.regionsHeld, data.defender.regionsHeld]] as [label, a, d] (label)}
					<div class="panel-muted rounded-sm p-2.5">
						<p class="text-[10px] uppercase tracking-wide text-fg-muted">{label}</p>
						<p class="font-mono text-lg font-bold">
							<span class="text-red-300">{a}</span><span class="text-fg-muted"> : </span><span class="text-friendly-fg"
								>{d}</span
							>
						</p>
					</div>
				{/each}
				<div class="panel-muted rounded-sm p-2.5">
					<p class="text-[10px] uppercase tracking-wide text-fg-muted">Battles on</p>
					<p class="font-mono text-lg font-bold {ongoing.length ? 'text-primary-fg' : 'text-fg'}">
						{ongoing.length}
					</p>
				</div>
			</div>
		</div>
	</article>

	<!-- Front line -->
	{#if active}
		<section class="panel rounded-sm p-5 space-y-3">
			<h2 class="section-title">
				Front line
				{#if data.frontLine.length}
					<span class="ml-auto text-xs font-normal normal-case tracking-normal text-fg-muted"
						>{data.frontLine.length} sectors</span
					>
				{/if}
			</h2>
			{#if data.frontLine.length === 0}
				<p class="text-sm text-fg-muted">No shared border. Nothing to attack yet.</p>
			{:else}
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each data.frontLine as r (r.regionId)}
						<a
							href={r.battleId ? `/battle/${r.battleId}` : `/region/${r.regionId}`}
							class="panel-interactive flex items-center gap-2.5 rounded-sm p-2.5 {r.battleId
								? 'border-red-500/40'
								: ''}"
						>
							<img src={regionCoatUrl(r.regionId)} alt="" class="size-9 shrink-0 object-contain" />
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-fg">{getRegionName(r.regionId)}</p>
								{#if r.battleId}
									<p class="flex items-center gap-1 text-[11px] text-red-300">
										<span class="size-1.5 rounded-full bg-red-500 animate-pulse"></span>Under fire
									</p>
								{:else}
									<p class="truncate text-[11px] text-fg-muted">{r.stateName}</p>
								{/if}
							</div>
						</a>
					{/each}
				</div>
				{#if data.me.canAttack}
					<p class="text-[11px] text-fg-muted">Attack from a bordering region of yours.</p>
				{/if}
			{/if}
		</section>
	{/if}

	<!-- Engagements -->
	<section class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">
			Engagements <span class="ml-auto text-xs font-normal normal-case tracking-normal text-fg-muted"
				>{data.battles.length}</span
			>
		</h2>
		{#if data.battles.length === 0}
			<p class="py-4 text-center text-sm text-fg-muted">No shots fired yet.</p>
		{:else}
			<ul class="space-y-2">
				{#each ongoing as b (b.id)}{@render battleRow(b)}{/each}
				{#if ongoing.length && finished.length}<li class="h-px bg-line/10" aria-hidden="true"></li>{/if}
				{#each finished as b (b.id)}{@render battleRow(b)}{/each}
			</ul>
		{/if}
	</section>

	<!-- Air war -->
	{#if data.strikes.length}
		{@const killed = data.strikes.reduce((n, s) => n + s.civilianCasualties, 0)}
		<section class="panel rounded-sm p-5 space-y-3" id="strikes">
			<h2 class="section-title">
				Air war
				<span class="ml-auto text-xs font-normal normal-case tracking-normal text-fg-muted">
					{data.strikes.length} strike{data.strikes.length === 1 ? "" : "s"} · {killed.toLocaleString("en-US")} civilians
					killed
				</span>
			</h2>
			<StrikeLog entries={data.strikes} />
		</section>
	{/if}

	<!-- Order of battle -->
	<div class="grid gap-4 sm:grid-cols-2">
		{#each ["attacker", "defender"] as const as side (side)}
			<section class="panel rounded-sm p-4 space-y-2">
				<h2 class="section-title {SIDE[side].text}">
					{SIDE[side].label}
					<span class="ml-auto text-xs font-normal normal-case tracking-normal text-fg-muted"
						>{data[side].states.length}</span
					>
				</h2>
				<ul class="divide-y divide-line/10">
					{#each data[side].states as s (s.id)}
						<li>
							<a href="/state/{s.id}" class="group flex items-center gap-2.5 py-2 {s.capitulated ? 'opacity-60' : ''}">
								<Logo
									src={s.logo}
									alt={s.name}
									class="size-8 rounded-sm"
									placeholderIcon={FluentBuildingGovernment20Filled}
								/>
								<span
									class="min-w-0 flex-1 truncate text-sm text-fg group-hover:text-primary-hover {s.capitulated
										? 'line-through'
										: ''}">{s.name}</span
								>
								{#if s.isMain}<Badge size="xs">Main</Badge>{/if}
								{#if s.capitulated}<Badge tone="red" size="xs">Capitulated</Badge>{/if}
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>

	{#if data.surrenders.length}
		<section class="panel rounded-sm p-5 space-y-2">
			<h2 class="section-title">Communiqués</h2>
			{#each data.surrenders as s, i (i)}
				<blockquote class="border-l-2 border-line/40 pl-3">
					<p class="text-sm text-fg">
						<FluentFlag20Filled class="mr-1 inline size-4 text-fg-body" />{s.stateName} surrendered
						<span class="font-mono text-xs text-fg-muted">· {formatDateTime(s.at)}</span>
					</p>
					{#if s.reason}<p class="mt-1 font-serif text-sm italic text-fg-soft">“{s.reason}”</p>{/if}
				</blockquote>
			{/each}
		</section>
	{/if}

	<!-- Surrender -->
	{#if data.me.canSurrender}
		<section class="rounded-sm border border-red-500/30 bg-red-600/10 p-5 space-y-3">
			<h2 class="section-title text-red-300">Surrender</h2>
			<form
				method="POST"
				action="?/surrender"
				class="space-y-3"
				use:confirmSubmit={{
					title: "Surrender and end the war?",
					body: "This can't be undone. Your state gives up and the war ends immediately.",
					confirmLabel: "Surrender",
					danger: true
				}}
				use:enhance={() => {
					surrendering = true;
					return async ({ result, update }) => {
						await update();
						surrendering = false;
						toastResult(result);
					};
				}}
			>
				<input
					name="reason"
					maxlength="300"
					placeholder="Statement to the world (optional)"
					class="field-control w-full rounded-sm px-3 py-2.5 text-sm"
				/>
				<div class="flex flex-wrap items-center gap-3">
					<Button type="submit" variant="danger" icon={FluentFlag20Filled} loading={surrendering}>Surrender</Button>
					<span class="text-xs text-fg-muted">Lost regions stay lost.</span>
				</div>
			</form>
		</section>
	{/if}

	<a href="/map" class="flex items-center justify-center gap-1 text-xs text-fg-muted hover:text-primary-hover">
		See the front on the map <FluentArrowRight20Filled class="size-3" />
	</a>
</PageContainer>
