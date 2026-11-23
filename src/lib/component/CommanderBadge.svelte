<!-- Compact commander card: portrait, level, wounds and trait tooltips. -->
<script lang="ts">
	import CommanderPortrait from "#lib/component/CommanderPortrait.svelte";
	import {
		COMMANDER_SYNERGIES,
		COMMANDER_TRAITS,
		commanderLevel,
		type CommanderTraitId
	} from "#lib/config/index.js";

	interface Commander {
		id: number;
		name: string;
		traitIds: string[];
		portrait: number;
		health: number;
		experience: number;
		alive: boolean;
	}

	let { officer, size = "md" }: { officer: Commander; size?: "sm" | "md" } = $props();

	const level = $derived(commanderLevel(officer.experience));
	const traits = $derived(
		officer.traitIds
			.map((id) => COMMANDER_TRAITS[id as CommanderTraitId])
			.filter((t): t is (typeof COMMANDER_TRAITS)[CommanderTraitId] => !!t)
	);
	const synergies = $derived(
		COMMANDER_SYNERGIES.filter((s) => s.needs.every((id) => officer.traitIds.includes(id)))
	);
</script>

<div class="commander-badge flex items-center gap-2">
	<CommanderPortrait seed={officer.portrait} alive={officer.alive} size={size === "sm" ? 28 : 40} />
	<div class="min-w-0">
		<div class="truncate text-sm font-medium text-heading">
			{officer.name}{officer.alive ? "" : " †"}
			<span class="ml-1 font-mono text-[10px] text-fg-faint">L{level}</span>
		</div>
		<div class="mt-0.5 flex flex-wrap gap-1">
			{#each traits as trait (trait.id)}
				<span class="trait" title={trait.description}>{trait.label}</span>
			{/each}
			{#each synergies as synergy (synergy.id)}
				<span class="synergy" title="Trait synergy: {synergy.needs.join(' + ')}">{synergy.label} ✦</span>
			{/each}
		</div>
		<div class="mt-1 flex items-center gap-1 text-[10px] text-fg-muted">
			<span class="h-1 w-16 overflow-hidden rounded-full bg-surface-4">
				<span class="block h-full rounded-full transition-all duration-700 {officer.health < 50 ? 'bg-error' : 'bg-positive'}" style="width:{officer.health}%"></span>
			</span>
			{officer.alive ? `${officer.health} hp` : "killed"}
		</div>
	</div>
</div>

<style>
	@reference "../../app.css";

	.trait {
		@apply rounded-sm border border-line/25 bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-soft;
		cursor: help;
	}
	.synergy {
		@apply rounded-sm border border-warning/30 bg-warning/12 px-1.5 py-0.5 text-[10px] text-warning;
		cursor: help;
	}
</style>
