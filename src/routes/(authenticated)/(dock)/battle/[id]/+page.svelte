<!-- src/routes/(authenticated)/(dock)/battle/[id]/+page.svelte -->
<script lang="ts">
	import { BUILDING_TEMPLATES } from "#lib/config/index.js";
	import SectionCard from "#lib/component/SectionCard.svelte";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { onMount } from "svelte";
	import { fly } from "svelte/transition";
	import { flip } from "svelte/animate";
	import * as m from "#lib/paraglide/messages.js";
	import { formatDateTime, getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { feedback } from "#lib/utils/feedback.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";
	import FluentLocation20Filled from "~icons/fluent/location-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";

	const { data } = $props();

	type Side = "attacker" | "defender";
	const SIDE = {
		attacker: { label: "Attackers", text: "text-red-300", bar: "bg-red-500", soft: "bg-red-600/10 border-red-500/30" },
		defender: {
			label: "Defenders",
			text: "text-[#c3dbff]",
			bar: "bg-[#6aa8ff]",
			soft: "bg-[#2f6be0]/18 border-[#6aa8ff]/30"
		}
	} as const;

	const regionName = $derived(getRegionName(data.battle.regionId));
	const unitName = (type: string) => (m as unknown as Record<string, (() => string) | undefined>)[type]?.() ?? type;

	// ── Clock ──────────────────────────────────────────────────────────────
	let now = $state(Date.now());
	onMount(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});
	const countdownTarget = $derived(
		data.battle.phase === "ended" ? null : data.battle.phase === "active" ? data.nextRoundAt : data.preparationEndsAt
	);
	const remaining = $derived(countdownTarget ? Math.max(0, new Date(countdownTarget).getTime() - now) : 0);
	const clock = $derived.by(() => {
		const s = Math.floor(remaining / 1000);
		const h = Math.floor(s / 3600);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${h > 0 ? `${h}:` : ""}${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
	});
	// When a round or the preparation is due, pick up the new state.
	let refreshedFor = 0;
	$effect(() => {
		const target = countdownTarget ? new Date(countdownTarget).getTime() : 0;
		if (target && remaining === 0 && refreshedFor !== target) {
			refreshedFor = target;
			setTimeout(() => invalidateAll(), 15_000); // the hourly job takes a moment
		}
	});

	// ── Status ─────────────────────────────────────────────────────────────
	// Region levels lost when the attacker took the region.
	const destroyed = $derived(
		Object.entries(data.battle.buildingsDestroyed ?? {}).map(([stat, lost]) => {
			const t = Object.values(BUILDING_TEMPLATES).find((b) => b.stat === stat);
			return { stat, lost: lost ?? 0, label: t?.statLabel ?? stat, icon: t?.icon ?? "🏚️" };
		})
	);

	const winner = $derived<Side | null>(
		data.battle.status === "attacker_won" ? "attacker" : data.battle.status === "defender_won" ? "defender" : null
	);
	const status = $derived(
		winner
			? {
					label: `${winner === "attacker" ? data.attacker.name : data.defender.name} won`,
					tone: winner === "attacker" ? ("red" as const) : ("blue" as const)
				}
			: data.battle.phase === "active"
				? { label: "Fighting", tone: "red" as const }
				: { label: "Preparing", tone: "amber" as const }
	);

	// Share of the remaining strength on the field: 50 is an even fight.
	const momentum = $derived.by(() => {
		const total = data.attacker.strength + data.defender.strength;
		return total === 0 ? 50 : Math.round((data.attacker.strength / total) * 100);
	});

	// Celebrate once if one of your units fought on the winning side.
	onMount(() => {
		if (!winner) return;
		const fought = (winner === "attacker" ? data.attacker : data.defender).units.some((u) => u.isMine);
		const key = `psyops:battle-cheered:${data.battle.id}`;
		try {
			if (!fought || sessionStorage.getItem(key)) return;
			sessionStorage.setItem(key, "1");
		} catch {
			if (!fought) return;
		}
		celebrate(document.getElementById("battle-hero"));
		feedback("win");
	});

	// ── Deploying ──────────────────────────────────────────────────────────
	let selected = $state<Set<number>>(new Set());
	let deploying = $state(false);
	const toggle = (id: number) => {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	};
	const allSelected = $derived(data.me.deployable.length > 0 && selected.size === data.me.deployable.length);

	// ── Rounds chart ─────────────────────────────────────────────────────────
	const chartRounds = $derived([...data.rounds].reverse().slice(-24));
	const chartMax = $derived(Math.max(1, ...chartRounds.flatMap((r) => [r.attackerDamage, r.defenderDamage])));
	let showAllRounds = $state(false);

	let fighting = $state(false);
	function shake() {
		const root = document.documentElement;
		root.classList.remove("screen-shake");
		void root.offsetWidth;
		root.classList.add("screen-shake");
		setTimeout(() => root.classList.remove("screen-shake"), 500);
	}
</script>

<svelte:head>
	<title>{`Battle of ${regionName} · PsyOps`}</title>
</svelte:head>

{#snippet bar(value: number, max: number, tone: string)}
	{@const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}
	<div class="h-1.5 w-full overflow-hidden rounded-full bg-[#0b1120]">
		<div class="h-full rounded-full transition-[width] duration-700 ease-out {tone}" style:width="{pct}%"></div>
	</div>
{/snippet}

{#snippet unitIcon(type: string, size = "size-9")}
	<div class="{size} shrink-0 rounded-sm border border-[#8ea6e0]/20 bg-[#0b1120] p-1.5">
		<img src="/units/{type}.svg" alt="" class="h-full w-full object-contain opacity-80 invert" />
	</div>
{/snippet}

{#snippet sideHeader(side: Side, s: typeof data.attacker)}
	<a
		href="/state/{s.id}"
		class="group flex min-w-0 items-center gap-3 {side === 'defender' ? 'flex-row-reverse text-right' : ''}"
	>
		<Logo
			src={s.logo}
			alt={s.name}
			class="size-11 shrink-0 rounded-sm"
			placeholderIcon={FluentBuildingGovernment20Filled}
			placeholderGradient={side === "attacker" ? "from-red-700 to-red-900" : "from-[#2f6be0] to-[#2148a8]"}
		/>
		<div class="min-w-0">
			<p class="text-[10px] font-semibold uppercase tracking-wide {SIDE[side].text}">{SIDE[side].label}</p>
			<p class="line-clamp-2 leading-tight font-bold text-[#eef2ff] transition-colors group-hover:text-[#ffc857]">
				{s.name}
			</p>
		</div>
	</a>
{/snippet}

{#snippet sideStats(side: Side, s: typeof data.attacker)}
	<div class="space-y-3">
		<p class="text-[10px] font-semibold uppercase tracking-wide sm:hidden {SIDE[side].text}">{SIDE[side].label}</p>
		<div>
			<div class="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-[#8e9abb]">
				<span>Strength</span><span class="font-mono text-[#dbe2f4]">{s.strength} / {s.maxStrength}</span>
			</div>
			{@render bar(s.strength, s.maxStrength, SIDE[side].bar)}
		</div>
		<div>
			<div class="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-[#8e9abb]">
				<span>Frontage used</span><span class="font-mono text-[#dbe2f4]">{s.usedWidth} / {s.maxWidth}</span>
			</div>
			{@render bar(s.usedWidth, s.maxWidth, "bg-[#f5a524]")}
		</div>
		<div class="grid grid-cols-3 gap-2 text-center">
			<div class="panel-muted rounded-sm p-2">
				<p class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Standing</p>
				<p class="font-bold text-[#eef2ff]">{s.standing}</p>
			</div>
			<div class="panel-muted rounded-sm p-2">
				<p class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Lost</p>
				<p class="font-bold {s.destroyed ? 'text-red-300' : 'text-[#eef2ff]'}">{s.destroyed}</p>
			</div>
			<div class="panel-muted rounded-sm p-2">
				<p class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Dealt</p>
				<p class="font-mono font-bold text-[#eef2ff]">{s.damageDealt}</p>
			</div>
		</div>
	</div>
{/snippet}

{#snippet forceList(side: Side, s: typeof data.attacker)}
	<section class="panel rounded-sm p-4 space-y-3">
		<h2 class="section-title {SIDE[side].text}">
			{SIDE[side].label}
			<span class="ml-auto text-xs font-normal normal-case tracking-normal text-[#8e9abb]"
				>{s.units.length} unit{s.units.length === 1 ? "" : "s"}</span
			>
		</h2>
		{#if s.units.length === 0}
			<p class="py-6 text-center text-sm text-[#8e9abb]">No units deployed yet.</p>
		{:else}
			<ul class="space-y-2">
				{#each s.units as u (u.id)}
					<li
						animate:flip={{ duration: 250 }}
						class="flex items-center gap-3 rounded-sm border p-2.5 {u.isMine
							? 'border-[#f5a524]/45 bg-[#f5a524]/8'
							: 'border-[#8ea6e0]/10 bg-[#0f1628]/80'} {u.destroyed ? 'opacity-45' : ''}"
					>
						{@render unitIcon(u.unitType)}
						<div class="min-w-0 flex-1 space-y-1.5">
							<div class="flex items-center gap-2">
								<p class="truncate text-sm font-semibold text-[#eef2ff]">{u.name}</p>
								{#if u.destroyed}
									<Badge tone="red" size="xs">Destroyed</Badge>
								{:else if u.isEngaged}
									<Badge tone="amber" size="xs">Front line</Badge>
								{:else}
									<Badge size="xs">Reserve</Badge>
								{/if}
							</div>
							<p class="flex min-w-0 items-center gap-1 text-[11px] text-[#8e9abb]">
								<span class="shrink-0">{unitName(u.unitType)} ·</span>
								{#if u.isMine}<span class="shrink-0 text-[#ffcb6b]">yours</span>{:else}<UserLink
										size="xs"
										id={u.ownerId}
										name={u.ownerName}
										avatar={u.ownerAvatar}
									/>{/if}
								<span class="shrink-0">· ⚔ {u.attack} 🛡 {u.defense}</span>
							</p>
							{#if !u.destroyed}
								<div class="grid grid-cols-2 gap-2">
									{@render bar(u.strength, u.maxStrength, SIDE[side].bar)}
									{@render bar(u.organization, 100, "bg-[#4fd88a]")}
								</div>
							{/if}
						</div>
						<div class="shrink-0 text-right font-mono text-[11px] text-[#8e9abb]">
							<p class="text-[#eef2ff]">{u.strength}</p>
							<p>↯ {u.damageDealt}</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/snippet}

<PageContainer maxWidth="5xl">
	<!-- Battle report header -->
	<div id="battle-hero" class="panel relative overflow-hidden rounded-sm">
		<div
			class="flex items-center justify-between gap-3 border-b border-[#8ea6e0]/15 bg-[#131c33]/70 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#8e9abb]"
		>
			<span>Battle report</span>
			<a href="/war/{data.battle.warId}" class="flex items-center gap-1 hover:text-[#ffc857]">
				War No. {data.battle.warId}
				<FluentArrowRight20Filled class="size-3" />
			</a>
		</div>
		<div class="p-5">
			<div class="flex items-start gap-4">
				<a href="/region/{data.battle.regionId}" class="shrink-0">
					<img src={regionCoatUrl(data.battle.regionId)} alt={regionName} class="size-16 object-contain sm:size-20" />
				</a>
				<div class="min-w-0 flex-1 space-y-1.5">
					<h1 class="font-serif text-2xl font-black text-[#eef2ff] sm:text-3xl">Battle of {regionName}</h1>
					{#if winner}
						<span
							class="inline-block animate-stamp rounded-sm border-2 border-double px-2.5 py-0.5 font-serif text-xs font-black uppercase tracking-[0.2em] {winner ===
							'attacker'
								? 'border-red-500/70 text-red-300'
								: 'border-[#6aa8ff]/70 text-[#c3dbff]'}"
							style="--stamp-tilt: -4deg"
						>
							{status.label}
						</span>
					{:else}
						<Badge tone={status.tone} size="md">{status.label}</Badge>
					{/if}
					<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8e9abb]">
						<span class="flex items-center gap-1"
							><FluentLocation20Filled class="size-3.5" /> <span class="capitalize">{data.battle.terrain}</span></span
						>
						<span>Started <span class="font-mono">{formatDateTime(data.battle.startedAt)}</span></span>
						{#if data.battle.endedAt}<span
								>Ended <span class="font-mono">{formatDateTime(data.battle.endedAt)}</span></span
							>{/if}
					</p>
				</div>
			</div>

			{#if countdownTarget}
				<div
					class="mt-4 flex items-center justify-between gap-3 rounded-sm border px-4 py-3 {data.battle.phase ===
					'active'
						? SIDE.attacker.soft
						: 'border-[#f5a524]/35 bg-[#f5a524]/12'}"
				>
					<span class="flex items-center gap-2 text-sm text-[#dbe2f4]">
						<FluentClock20Filled class="size-4 {data.battle.phase === 'active' ? 'text-red-400' : 'text-[#ffcb6b]'}" />
						{data.battle.phase === "active" ? "Next round" : "Fighting starts"}
					</span>
					<span class="font-mono text-xl font-bold text-[#eef2ff] tabular-nums">{remaining > 0 ? clock : "now"}</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Battle line -->
	<section class="panel rounded-sm p-5 space-y-5">
		<div class="flex items-center justify-between gap-4">
			{@render sideHeader("attacker", data.attacker)}
			<span class="shrink-0 text-xs font-bold text-[#8e9abb]">VS</span>
			{@render sideHeader("defender", data.defender)}
		</div>

		<!-- Momentum: share of the strength still on the field -->
		<div>
			<div class="relative h-4 overflow-hidden rounded-full bg-[#0b1120]">
				<div
					class="absolute inset-y-0 left-0 bg-red-500 transition-[width] duration-1000 ease-out"
					style:width="{momentum}%"
				></div>
				<div
					class="absolute inset-y-0 right-0 bg-[#6aa8ff] transition-[width] duration-1000 ease-out"
					style:width="{100 - momentum}%"
				></div>
				<div class="absolute inset-y-0 left-1/2 w-px bg-[#eef2ff]/40"></div>
			</div>
			<div class="mt-1.5 flex justify-between text-xs">
				<span class="font-mono text-red-300">{momentum}%</span>
				<span class="text-[10px] uppercase tracking-wide text-[#8e9abb]">Strength on the field</span>
				<span class="font-mono text-[#c3dbff]">{100 - momentum}%</span>
			</div>
		</div>

		<div class="grid gap-5 sm:grid-cols-2">
			{@render sideStats("attacker", data.attacker)}
			<div class="space-y-3">
				{@render sideStats("defender", data.defender)}
				{#if data.battle.fortification > 0}
					<p
						class="flex items-center gap-2 rounded-sm border border-[#6aa8ff]/30 bg-[#2f6be0]/18 px-3 py-2 text-xs text-[#c3dbff]"
					>
						<FluentShield20Filled class="size-4 shrink-0" />
						Fortified (level {data.battle.fortification}): −{data.battle.fortificationReduction}% damage taken
					</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- What the conquest wrecked -->
	{#if destroyed.length}
		<SectionCard>
			<h2 class="section-title mb-3">Buildings destroyed</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
				{#each destroyed as d (d.stat)}
					<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-3 flex items-center gap-2 animate-pop-in">
						<span class="text-2xl" aria-hidden="true">{d.icon}</span>
						<div class="min-w-0">
							<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide truncate">{d.label}</p>
							<p class="text-sm font-bold text-red-300 font-mono">−{d.lost} level{d.lost === 1 ? "" : "s"}</p>
						</div>
					</div>
				{/each}
			</div>
		</SectionCard>
	{/if}

	<!-- Your forces -->
	{#if data.battle.phase !== "ended"}
		<section id="your-forces" class="panel rounded-sm p-5 space-y-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="section-title">Your Forces</h2>
				{#if data.me.side}
					<span class="rounded-sm border px-2.5 py-1 text-xs {SIDE[data.me.side].soft}">
						Fighting as <strong class={SIDE[data.me.side].text}>{data.me.side}</strong>
					</span>
				{/if}
			</div>

			{#if !data.me.side}
				<p class="text-sm text-[#c2cbe3]">{data.me.reason}</p>
				<Button href="/region/{data.battle.regionId}" variant="secondary" size="sm" icon={FluentLocation20Filled}
					>Go to {regionName}</Button
				>
			{:else if data.me.deployable.length === 0}
				<p class="text-sm text-[#c2cbe3]">
					No rested, trained units {data.me.side === "defender" ? `in ${regionName}` : "in your current region"}.
				</p>
				<Button href="/training" variant="secondary" size="sm">Train units</Button>
			{:else}
				<div class="flex items-center justify-between text-xs text-[#8e9abb]">
					<span>{selected.size} of {data.me.deployable.length} selected</span>
					<button
						type="button"
						class="text-[#dbe2f4] hover:text-[#ffc857]"
						onclick={() => (selected = allSelected ? new Set() : new Set(data.me.deployable.map((u) => u.id)))}
					>
						{allSelected ? "Clear" : "Select all"}
					</button>
				</div>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each data.me.deployable as u (u.id)}
						{@const on = selected.has(u.id)}
						<button
							type="button"
							class="press-spring flex items-center gap-3 rounded-sm border p-3 text-left {on
								? 'border-[#4fd88a]/60 bg-[#1f9d62]/18'
								: 'border-[#8ea6e0]/15 bg-[#131c33]/70 hover:border-[#f5a524]/55'}"
							aria-pressed={on}
							onclick={() => toggle(u.id)}
						>
							{@render unitIcon(u.unitType, "size-10")}
							<div class="min-w-0 flex-1 space-y-1">
								<p class="truncate text-sm font-semibold text-[#eef2ff]">{u.name}</p>
								<p class="text-[11px] text-[#8e9abb]">
									{unitName(u.unitType)} · ⚔ {u.attack} 🛡 {u.defense} · {u.experience} XP
								</p>
								<div class="grid grid-cols-2 gap-2">
									{@render bar(u.health, 100, "bg-[#6aa8ff]")}
									{@render bar(u.organization, 100, "bg-[#4fd88a]")}
								</div>
							</div>
							<span
								class="grid size-5 shrink-0 place-items-center rounded-full border {on
									? 'border-[#4fd88a] bg-[#4fd88a] text-[#0c1222]'
									: 'border-[#8ea6e0]/40'}"
							>
								{#if on}✓{/if}
							</span>
						</button>
					{/each}
				</div>
				<form
					method="POST"
					action="?/deploy"
					use:enhance={() => {
						deploying = true;
						return async ({ result, update }) => {
							await update();
							deploying = false;
							toastResult(result);
							if (result.type === "success") {
								selected = new Set();
								celebrate(document.getElementById("your-forces"));
							}
						};
					}}
				>
					{#each [...selected] as id (id)}<input type="hidden" name="unitIds" value={id} />{/each}
					<Button
						type="submit"
						block
						icon={FluentFlash20Filled}
						disabled={selected.size === 0}
						loading={deploying}
						loadingText="Deploying..."
					>
						{selected.size
							? `Send ${selected.size} unit${selected.size === 1 ? "" : "s"} into battle`
							: "Select units to deploy"}
					</Button>
				</form>
			{/if}

			{#if data.me.isAdmin && data.battle.phase === "active"}
				<form
					method="POST"
					action="?/fightRound"
					class="border-t border-[#8ea6e0]/10 pt-3"
					use:enhance={() => {
						fighting = true;
						return async ({ result, update }) => {
							await update();
							fighting = false;
							toastResult(result);
							if (result.type === "success") shake();
						};
					}}
				>
					<Button type="submit" variant="soft-red" size="sm" loading={fighting}>Fight a round now (admin)</Button>
				</form>
			{/if}
		</section>
	{/if}

	<!-- Both armies -->
	<div class="grid gap-4 lg:grid-cols-2">
		{@render forceList("attacker", data.attacker)}
		{@render forceList("defender", data.defender)}
	</div>

	<!-- Course of the battle -->
	<section class="panel rounded-sm p-5 space-y-4">
		<h2 class="section-title">Course of the Battle</h2>
		{#if data.rounds.length === 0}
			<p class="py-6 text-center text-sm text-[#8e9abb]">
				{data.battle.phase === "ended" ? "The battle ended without a fight." : "No rounds fought yet."}
			</p>
		{:else}
			<!-- Damage per round: attackers above, defenders below the line -->
			<div class="flex h-36 items-stretch gap-1" role="img" aria-label="Damage dealt per round">
				{#each chartRounds as r (r.number)}
					<div class="group relative flex flex-1 flex-col justify-center" in:fly={{ y: 8, duration: 300 }}>
						<div class="flex flex-1 items-end">
							<div
								class="w-full rounded-t-sm bg-red-500/80"
								style:height="{(r.attackerDamage / chartMax) * 100}%"
							></div>
						</div>
						<div class="h-px bg-[#8ea6e0]/30"></div>
						<div class="flex flex-1 items-start">
							<div
								class="w-full rounded-b-sm bg-[#6aa8ff]/80"
								style:height="{(r.defenderDamage / chartMax) * 100}%"
							></div>
						</div>
						<div
							class="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm border border-[#8ea6e0]/30 bg-[#0c1222] px-2 py-1 text-[10px] text-[#dbe2f4] group-hover:block"
						>
							Round {r.number}: <span class="text-red-300">{r.attackerDamage}</span> /
							<span class="text-[#c3dbff]">{r.defenderDamage}</span>
						</div>
					</div>
				{/each}
			</div>
			<div class="flex justify-between text-[10px] text-[#8e9abb]">
				<span><span class="text-red-300">■</span> Attackers' damage</span>
				<span><span class="text-[#c3dbff]">■</span> Defenders' damage</span>
			</div>

			<ul class="divide-y divide-[#8ea6e0]/10">
				{#each showAllRounds ? data.rounds : data.rounds.slice(0, 6) as r (r.number)}
					<li class="flex items-center justify-between gap-3 py-2 text-sm">
						<span class="font-mono text-[#8e9abb]">#{r.number}</span>
						<span class="flex-1 text-[#c2cbe3]">
							<span class="text-red-300">{r.attackerDamage}</span> dealt by {r.attackersEngaged} attacker{r.attackersEngaged ===
							1
								? ""
								: "s"},
							<span class="text-[#c3dbff]">{r.defenderDamage}</span> by {r.defendersEngaged} defender{r.defendersEngaged ===
							1
								? ""
								: "s"}
						</span>
						<span class="hidden text-xs text-[#8e9abb] sm:inline">{formatDateTime(r.at)}</span>
					</li>
				{/each}
			</ul>
			{#if data.rounds.length > 6}
				<button
					type="button"
					class="text-xs text-[#dbe2f4] hover:text-[#ffc857]"
					onclick={() => (showAllRounds = !showAllRounds)}
				>
					{showAllRounds ? "Show fewer rounds" : `Show all ${data.rounds.length} rounds`}
				</button>
			{/if}
		{/if}
	</section>
</PageContainer>
