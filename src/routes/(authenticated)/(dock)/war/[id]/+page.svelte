<!-- src/routes/(authenticated)/(dock)/war/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { onMount } from "svelte";
	import { formatDateTime, getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentArrowRight20Filled from "~icons/fluent/arrow-right-20-filled";

	const { data } = $props();

	type Side = "attacker" | "defender";
	const SIDE = {
		attacker: { label: "Attackers", text: "text-red-300", bar: "bg-red-500", ring: "border-red-500/40" },
		defender: { label: "Defenders", text: "text-[#b3dcff]", bar: "bg-[#5eaef5]", ring: "border-[#5eaef5]/40" }
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

	let surrendering = $state(false);
</script>

<svelte:head>
	<title>{`${main("attacker")?.name ?? "War"} vs ${main("defender")?.name ?? ""} · PsyOps`}</title>
</svelte:head>

{#snippet sideBadge(side: Side)}
	{@const s = main(side)}
	<a href="/state/{s?.id}" class="group flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
		<Logo
			src={s?.logo}
			alt={s?.name ?? ""}
			class="size-16 rounded-sm border-2 sm:size-20 {SIDE[side].ring}"
			placeholderIcon={FluentBuildingGovernment20Filled}
			placeholderGradient={side === "attacker" ? "from-red-700 to-red-900" : "from-[#2369b5] to-[#1d4f88]"}
		/>
		<div class="min-w-0">
			<p class="text-[10px] font-semibold uppercase tracking-wide {SIDE[side].text}">{SIDE[side].label}</p>
			<p class="line-clamp-2 font-bold leading-tight text-[#f5efd8] group-hover:text-[#ffcf47]">{s?.name}</p>
			{#if data[side].bloc}
				<p class="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[#a8a083]">
					<span class="size-2 rounded-full" style:background={data[side].bloc!.color}></span>
					{data[side].bloc!.name}
				</p>
			{/if}
		</div>
	</a>
{/snippet}

{#snippet battleRow(b: (typeof data.battles)[number])}
	{@const won = b.status === "attacker_won" ? "attacker" : b.status === "defender_won" ? "defender" : null}
	<a href="/battle/{b.id}" class="panel-interactive flex items-center gap-3 rounded-sm p-3">
		<img src={regionCoatUrl(b.regionId)} alt="" class="size-10 shrink-0 object-contain" />
		<div class="min-w-0 flex-1">
			<p class="truncate font-semibold text-[#f5efd8]">Battle of {getRegionName(b.regionId)}</p>
			<p class="truncate text-xs text-[#a8a083]">
				<span class="text-red-300">{b.attackerName}</span> → <span class="text-[#b3dcff]">{b.defenderName}</span> ·
				{formatDateTime(b.startedAt)}
			</p>
		</div>
		{#if won}
			<Badge tone={won === "attacker" ? "red" : "blue"} size="xs">{won === "attacker" ? "Taken" : "Held"}</Badge>
		{:else if b.phase === "active"}
			<Badge tone="red" size="xs">Fighting</Badge>
		{:else}
			<Badge tone="amber" size="xs">Preparing</Badge>
		{/if}
	</a>
{/snippet}

<PageContainer maxWidth="5xl">
	<!-- Header -->
	<div class="panel rounded-sm p-5 space-y-5">
		<div class="flex items-start gap-3">
			{@render sideBadge("attacker")}
			<div class="flex shrink-0 flex-col items-center gap-2 pt-5">
				<span class="text-2xl">⚔️</span>
				{#if data.war.status === "active"}
					<Badge tone="red" size="sm">At war</Badge>
				{:else}
					<Badge size="sm">Ended</Badge>
				{/if}
			</div>
			{@render sideBadge("defender")}
		</div>

		<div class="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#a8a083]">
			<span>Declared {formatDateTime(data.war.declaredAt)}</span>
			{#if data.war.declaredBy}
				<span
					>by <a href="/user/{data.war.declaredBy.id}" class="text-[#e6ddbf] hover:text-[#ffcf47]"
						>{data.war.declaredBy.name}</a
					></span
				>
			{/if}
			<span>{data.war.status === "active" ? "Lasting" : "Lasted"} {duration}</span>
		</div>

		{#if data.war.status !== "active"}
			<p class="rounded-sm border border-[#c8b47a]/20 bg-[#1a1f15] px-4 py-3 text-center text-sm text-[#e6ddbf]">
				Ended {data.war.endedAt ? formatDateTime(data.war.endedAt) : ""}
				{#if data.war.endedReason}by <strong>{data.war.endedReason}</strong>{/if}
				{#if data.war.surrenderedByName}: {data.war.surrenderedByName} gave up{/if}.
			</p>
		{:else}
			<div>
				<div class="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-[#a8a083]">
					<span>War exhaustion</span>
					<span class="font-mono text-[#e6ddbf]">{data.war.exhaustion} / {data.war.exhaustionLimit}</span>
				</div>
				<div class="h-2 overflow-hidden rounded-full bg-[#0f120c]">
					<div
						class="h-full rounded-full transition-[width] duration-700 {exhaustionPct > 80
							? 'bg-red-500'
							: 'bg-[#f2b01e]'}"
						style:width="{exhaustionPct}%"
					></div>
				</div>
				<p class="mt-1.5 text-[11px] text-[#a8a083]">
					At {data.war.exhaustionLimit} the war ends in a white peace. It also ends after {data.war.stalemateDays} days without
					a battle, or when a side has no regions left.
				</p>
			</div>
		{/if}

		<!-- Scoreboard -->
		<div class="grid grid-cols-3 gap-2 text-center">
			{#each [["Battles won", data.attacker.battlesWon, data.defender.battlesWon], ["Regions held", data.attacker.regionsHeld, data.defender.regionsHeld]] as [label, a, d] (label)}
				<div class="panel-muted rounded-sm p-2.5">
					<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">{label}</p>
					<p class="font-mono font-bold">
						<span class="text-red-300">{a}</span> <span class="text-[#a8a083]">:</span>
						<span class="text-[#b3dcff]">{d}</span>
					</p>
				</div>
			{/each}
			<div class="panel-muted rounded-sm p-2.5">
				<p class="text-[10px] uppercase tracking-wide text-[#a8a083]">Battles on</p>
				<p class="font-mono font-bold {ongoing.length ? 'text-[#ffd35c]' : 'text-[#f5efd8]'}">{ongoing.length}</p>
			</div>
		</div>
	</div>

	<!-- Front line -->
	{#if data.war.status === "active"}
		<section class="panel rounded-sm p-5 space-y-3">
			<h2 class="section-title">Front Line</h2>
			{#if data.frontLine.length === 0}
				<p class="text-sm text-[#a8a083]">
					The two sides don't share a border, so no region can be attacked right now.
				</p>
			{:else}
				<p class="text-xs text-[#a8a083]">
					Defender regions on the border with the attackers.
					{#if data.me.canAttack}As president you can start a battle from a bordering region of yours.{/if}
				</p>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each data.frontLine as r (r.regionId)}
						<a
							href={r.battleId ? `/battle/${r.battleId}` : `/region/${r.regionId}`}
							class="panel-interactive flex items-center gap-2.5 rounded-sm p-2.5"
						>
							<img src={regionCoatUrl(r.regionId)} alt="" class="size-9 shrink-0 object-contain" />
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold text-[#f5efd8]">{getRegionName(r.regionId)}</p>
								{#if r.battleId}
									<p class="text-[11px] text-red-300">Battle under way</p>
								{:else}
									<p class="truncate text-[11px] text-[#a8a083]">{r.stateName}</p>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Battles -->
	<section class="panel rounded-sm p-5 space-y-3">
		<h2 class="section-title">
			Battles <span class="ml-auto text-xs font-normal normal-case tracking-normal text-[#a8a083]"
				>{data.battles.length}</span
			>
		</h2>
		{#if data.battles.length === 0}
			<p class="py-4 text-center text-sm text-[#a8a083]">No battles have been fought in this war yet.</p>
		{:else}
			<div class="space-y-2">
				{#each ongoing as b (b.id)}{@render battleRow(b)}{/each}
				{#if ongoing.length && finished.length}<div class="h-px bg-[#c8b47a]/10"></div>{/if}
				{#each finished as b (b.id)}{@render battleRow(b)}{/each}
			</div>
		{/if}
	</section>

	<!-- Coalitions -->
	<div class="grid gap-4 sm:grid-cols-2">
		{#each ["attacker", "defender"] as const as side (side)}
			<section class="panel rounded-sm p-4 space-y-2">
				<h2 class="section-title {SIDE[side].text}">{SIDE[side].label}</h2>
				{#each data[side].states as s (s.id)}
					<a href="/state/{s.id}" class="flex items-center gap-2.5 rounded-sm p-1.5 hover:bg-[#2e3524]">
						<Logo
							src={s.logo}
							alt={s.name}
							class="size-8 rounded-sm"
							placeholderIcon={FluentBuildingGovernment20Filled}
						/>
						<span class="min-w-0 flex-1 truncate text-sm text-[#f5efd8]">{s.name}</span>
						{#if s.isMain}<Badge size="xs">Main</Badge>{/if}
						{#if s.capitulated}<Badge tone="red" size="xs">Capitulated</Badge>{/if}
					</a>
				{/each}
			</section>
		{/each}
	</div>

	{#if data.surrenders.length}
		<section class="panel rounded-sm p-5 space-y-2">
			<h2 class="section-title">Surrenders</h2>
			{#each data.surrenders as s, i (i)}
				<div class="panel-muted rounded-sm p-3 text-sm">
					<p class="text-[#f5efd8]">
						<FluentFlag20Filled class="mr-1 inline size-4 text-[#e6ddbf]" />{s.stateName} surrendered · {formatDateTime(
							s.at
						)}
					</p>
					{#if s.reason}<p class="mt-1 text-xs italic text-[#a8a083]">"{s.reason}"</p>{/if}
				</div>
			{/each}
		</section>
	{/if}

	<!-- Surrender -->
	{#if data.me.canSurrender}
		<section class="rounded-sm border border-red-500/30 bg-red-600/10 p-5 space-y-3">
			<h2 class="section-title text-red-300">Surrender</h2>
			<p class="text-sm text-[#d3caa9]">
				As president you can end the war by giving up. Borders stay as they are; regions already lost stay lost.
			</p>
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
				<Button type="submit" variant="danger" icon={FluentFlag20Filled} loading={surrendering}>Surrender</Button>
			</form>
		</section>
	{/if}

	<a href="/map" class="flex items-center justify-center gap-1 text-xs text-[#a8a083] hover:text-[#ffcf47]">
		See the front on the map <FluentArrowRight20Filled class="size-3" />
	</a>
</PageContainer>
