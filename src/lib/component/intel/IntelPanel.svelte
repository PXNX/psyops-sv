<!-- How well the viewer's state knows a foreign state: the overall intel level,
     each stat group's confidence, what feeds it and how to raise it. -->
<script lang="ts">
	import {
		GROUP_SOURCES,
		INTEL_GROUPS,
		INTEL_GROUP_LABEL,
		intelTier,
		type IntelLevel,
		type IntelRelation
	} from "#lib/utils/intel-estimate.js";
	import IntelBadge from "./IntelBadge.svelte";
	import IconEye from "~icons/fluent/eye-20-regular";

	interface Props {
		stateId: number;
		stateName: string;
		relation: IntelRelation;
		level: IntelLevel;
		/** The viewer runs ops for their state, so the action links apply to them. */
		canRunOps: boolean;
	}
	let { stateId, stateName, relation, level, canRunOps }: Props = $props();

	const pct = (n: number) => `${Math.round(n * 100)}%`;
	const overallTier = $derived(intelTier(level.overall));

	const ways = $derived([
		{
			href: `/ops/network?target=${stateId}`,
			label: "Plant assets",
			detail: "Each active asset inside raises every figure a little."
		},
		{
			href: `/ops/network?target=${stateId}`,
			label: "Copy files",
			detail:
				"Documents narrow their own field: air bases and command centres the military, power plants energy, companies and factories the economy."
		},
		{
			href: "/intel",
			label: "Fly recon",
			detail: "Recon passes over its regions sharpen military and population figures."
		},
		{ href: "/ops", label: "Run covert ops", detail: "Every successful operation adds a little to the picture." }
	]);
</script>

<section class="panel rounded-sm p-4 sm:p-5" aria-labelledby="intel-title">
	<div class="flex flex-wrap items-center gap-2">
		<h2 id="intel-title" class="section-title"><IconEye class="size-4" /> Intelligence picture</h2>
		<span class="ml-auto flex items-center gap-2">
			<span class="font-mono text-lg font-bold text-fg">{pct(level.overall)}</span>
			<IntelBadge tier={overallTier} />
		</span>
	</div>
	<p class="mt-1 text-xs text-fg-muted">
		{#if relation === "bloc"}
			A bloc partner: {stateName} shares most of its figures with you.
		{:else}
			Figures on this page are estimates. The interval always holds the true value and narrows as your intel grows.
		{/if}
	</p>

	<ul class="mt-3 space-y-1.5">
		{#each INTEL_GROUPS as group (group)}
			{@const value = level.groups[group]}
			<li
				class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2"
				title="Sharpened by {GROUP_SOURCES[group]}."
			>
				<span class="truncate text-xs text-fg-soft">{INTEL_GROUP_LABEL[group]}</span>
				<span class="relative h-1.5 rounded-full bg-surface-7" aria-hidden="true">
					<span class="absolute inset-y-0 left-0 rounded-full bg-primary/70" style="width: {pct(value)}"></span>
				</span>
				<span class="flex items-center gap-1.5">
					<span class="w-9 text-right font-mono text-[11px] text-fg-muted">{pct(value)}</span>
					<IntelBadge tier={intelTier(value)} />
				</span>
			</li>
		{/each}
	</ul>

	{#if level.sources.length}
		<h3 class="mt-4 text-[10px] tracking-[0.14em] text-fg-muted uppercase">Sources</h3>
		<ul class="mt-1 flex flex-wrap gap-1.5">
			{#each level.sources as source (source.label)}
				<li class="panel-muted rounded-sm px-2 py-0.5 text-[11px] text-fg-soft">
					{source.label} <span class="font-mono text-fg-muted">+{pct(source.amount)}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if relation !== "self"}
		<h3 class="mt-4 text-[10px] tracking-[0.14em] text-fg-muted uppercase">Raise it</h3>
		<ul class="mt-1 space-y-1.5">
			{#each ways as way (way.label)}
				<li class="text-xs text-fg-soft">
					{#if canRunOps}
						<a href={way.href} class="font-semibold text-primary-fg hover:underline">{way.label}</a>
					{:else}
						<span class="font-semibold text-fg">{way.label}</span>
					{/if}
					— {way.detail}
				</li>
			{/each}
		</ul>
		{#if !canRunOps}
			<p class="mt-2 text-[11px] text-fg-faint">
				Ops are run by your president and defence or foreign minister; their findings reach the whole state.
			</p>
		{/if}
	{/if}
</section>
