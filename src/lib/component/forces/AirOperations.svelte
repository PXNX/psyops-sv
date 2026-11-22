<!-- The aviation console: task ready squadrons with air missions. Shared by
     the Aviation tab of the Forces page and the (redirected) fleet console. -->
<script lang="ts">
	import { enhance, type SubmitFunction } from "$app/forms";
	import { AIRCRAFT, AIR_MISSIONS, AIR_MISSION_IDS } from "#lib/config/index.js";
	import { Button, Badge } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";

	type Unit = { id: number; unitType: string; fuel: number; experience: number };
	type Region = { id: number; stateId: number | null; label: string };
	type Mission = { kind: string; status: string; completesAt: string };

	interface Props {
		airSupport: { units: Unit[]; byType: Record<string, number>; roles?: Record<string, number> };
		airMissions: Mission[];
		regionList: Region[];
		myStateId: number | null;
		canCommand: boolean;
	}

	let { airSupport, airMissions, regionList, myStateId, canCommand }: Props = $props();

	let airUnitId = $state<number | undefined>(airSupport.units[0]?.id);
	let airMissionKind = $state<(typeof AIR_MISSION_IDS)[number]>("strategic_bombing");
	let airTargetRegion = $state<number | undefined>(regionList[0]?.id);
	let hexQ = $state(0);
	let hexR = $state(0);

	const enhanceForm: SubmitFunction = () => async ({ result, update }) => {
		await update();
		toastResult(result);
	};
</script>

{#if airSupport.units.length === 0}
	<p class="mt-1 text-xs text-fg-muted">No aircraft trained yet. Enlist a squadron in the Aviation tab.</p>
{:else}
	<div class="mt-1 flex flex-wrap gap-1">
		{#each Object.entries(airSupport.byType) as [type, count]}
			<Badge tone="blue">{AIRCRAFT[type as keyof typeof AIRCRAFT]?.short ?? type} ×{count}</Badge>
		{/each}
	</div>
	{#if canCommand}
		<form
			method="POST"
			action="?/launchAirMission"
			use:enhance={enhanceForm}
			data-tutorial="air-ops"
			class="mt-3 space-y-2"
			onclick={() => window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "air-panel-open" }))}
		>
			<select name="unitId" bind:value={airUnitId} class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs">
				{#each airSupport.units as unit}
					<option value={unit.id}>
						{AIRCRAFT[unit.unitType as keyof typeof AIRCRAFT]?.label ?? unit.unitType} · {unit.fuel} fuel · {unit.experience} exp
					</option>
				{/each}
			</select>
			<select
				name="kind"
				bind:value={airMissionKind}
				data-tutorial="air-kind"
				class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs"
				onchange={() => window.dispatchEvent(new CustomEvent("psyops:tutorial", { detail: "air-kind-changed" }))}
			>
				{#each AIR_MISSION_IDS as kind}
					<option value={kind}>{AIR_MISSIONS[kind].label}</option>
				{/each}
			</select>
			{#if AIR_MISSIONS[airMissionKind].target !== "hex"}
				<select
					name="targetRegionId"
					bind:value={airTargetRegion}
					class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs"
				>
					{#each regionList.filter((r) => AIR_MISSIONS[airMissionKind].target !== "friendly_region" || r.stateId === myStateId) as region}
						<option value={region.id}>{region.label}</option>
					{/each}
				</select>
			{:else}
				<div class="flex items-center gap-2 text-xs">
					<span class="text-fg-muted">Target hex</span>
					<input type="number" name="q" bind:value={hexQ} class="w-20 rounded border border-line/30 bg-surface-2 px-2 py-1" />
					<input type="number" name="r" bind:value={hexR} class="w-20 rounded border border-line/30 bg-surface-2 px-2 py-1" />
				</div>
			{/if}
			<p class="text-[11px] text-fg-muted">
				{AIR_MISSIONS[airMissionKind].blurb} · {AIR_MISSIONS[airMissionKind].fuelCost} fuel · ~{AIR_MISSIONS[airMissionKind].durationHours}h
			</p>
			<Button type="submit" size="sm">Launch mission</Button>
		</form>
	{/if}
{/if}
{#if airMissions.length}
	<ul class="mt-3 space-y-1 border-t border-line/15 pt-2 text-[11px]">
		{#each airMissions as mission}
			<li class="flex justify-between gap-2">
				<span>{AIR_MISSIONS[mission.kind as keyof typeof AIR_MISSIONS]?.label ?? mission.kind}</span>
				<span class="text-fg-muted">{mission.status}</span>
			</li>
		{/each}
	</ul>
{/if}
