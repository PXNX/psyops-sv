<!-- The aviation console: task ready squadrons with air missions. Shared by
     the Aviation tab of the Forces page and the (redirected) fleet console. -->
<script lang="ts">
	import { enhance, type SubmitFunction } from "$app/forms";
	import { AIRCRAFT, AIR_MISSIONS, AIR_MISSION_IDS, airReach, hexDistance, type Hex } from "#lib/config/index.js";
	import { Button, Badge, SearchSelect } from "#lib/component/ui/index.js";
	import { getRegionName } from "#lib/utils/formatting.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";

	type Unit = { id: number; unitType: string; regionId: number; fuel: number; experience: number };
	type Region = { id: number; stateId: number | null; label: string; hex: Hex };
	type Mission = { kind: string; status: string; completesAt: string | null };
	type Airbase = { regionId: number; hex: Hex };

	interface Props {
		airSupport: { units: Unit[]; byType: Record<string, number>; roles?: Record<string, number> };
		airMissions: Mission[];
		regionList: Region[];
		airbases: Airbase[];
		myStateId: number | null;
		canCommand: boolean;
	}

	let { airSupport, airMissions, regionList, airbases, myStateId, canCommand }: Props = $props();

	let airUnitId = $state<number | undefined>(airSupport.units[0]?.id);
	let airMissionKind = $state<(typeof AIR_MISSION_IDS)[number]>("strategic_bombing");
	let airTargetRegion = $state<string | undefined>(undefined);
	let rebaseTo = $state<string | undefined>(undefined);
	let hexQ = $state(0);
	let hexR = $state(0);

	const unit = $derived(airSupport.units.find((u) => u.id === airUnitId));
	const spec = $derived(unit ? AIRCRAFT[unit.unitType as keyof typeof AIRCRAFT] : undefined);
	const base = $derived(unit ? airbases.find((b) => b.regionId === unit.regionId) : undefined);
	const mission = $derived(AIR_MISSIONS[airMissionKind]);

	/** Regions the chosen mission may target, each tagged with its distance from the base. */
	const targetItems = $derived(
		regionList
			.filter((r) => mission.target !== "friendly_region" || r.stateId === myStateId)
			.map((r) => {
				const d = base ? hexDistance(base.hex, r.hex) : null;
				const inRange = d !== null && spec ? d <= spec.rangeHexes : false;
				return {
					id: r.id,
					name: getRegionName(r.id),
					hint: d === null ? null : `${d} hexes${inRange ? "" : " · out of range"}`,
					d: d ?? Infinity
				};
			})
			.sort((a, b) => a.d - b.d)
	);
	const targetHex = $derived.by((): Hex | null => {
		if (mission.target === "hex") return { q: hexQ, r: hexR };
		return regionList.find((r) => r.id === Number(airTargetRegion))?.hex ?? null;
	});
	const verdict = $derived(unit && targetHex ? airReach(unit.unitType, base?.hex ?? null, targetHex) : null);

	const airbaseItems = $derived(
		airbases
			.filter((b) => b.regionId !== unit?.regionId)
			.map((b) => ({
				id: b.regionId,
				name: getRegionName(b.regionId),
				hint: base ? `${hexDistance(base.hex, b.hex)} hexes` : null
			}))
	);

	const enhanceForm: SubmitFunction =
		() =>
		async ({ result, update }) => {
			await update();
			toastResult(result);
		};
</script>

{#if airbases.length === 0}
	<p class="mt-1 text-xs text-warning">
		Your state has no airbase. Squadrons are stationed at and fly only from airbases; parliament has to enact one as a
		construction law.
	</p>
{/if}
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
			<select
				name="unitId"
				bind:value={airUnitId}
				class="w-full rounded border border-line/30 bg-surface-2 px-2 py-1 text-xs"
			>
				{#each airSupport.units as unit}
					<option value={unit.id}>
						{AIRCRAFT[unit.unitType as keyof typeof AIRCRAFT]?.label ?? unit.unitType} · {unit.fuel} fuel · {unit.experience}
						exp
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
			{#if mission.target !== "hex"}
				<SearchSelect
					name="targetRegionId"
					items={targetItems}
					bind:value={airTargetRegion}
					showId
					placeholder="Target region…"
					searchPlaceholder="Search regions…"
					empty="No regions found."
				/>
			{:else}
				<div class="flex items-center gap-2 text-xs">
					<span class="text-fg-muted">Target hex</span>
					<input
						type="number"
						name="q"
						bind:value={hexQ}
						class="w-20 rounded border border-line/30 bg-surface-2 px-2 py-1"
					/>
					<input
						type="number"
						name="r"
						bind:value={hexR}
						class="w-20 rounded border border-line/30 bg-surface-2 px-2 py-1"
					/>
				</div>
			{/if}
			{#if unit && spec}
				<p class="text-[11px] text-fg-muted" data-testid="air-range">
					{#if base}
						Based at {getRegionName(base.regionId)} · reaches {spec.rangeHexes} hexes{#if verdict?.distance != null}
							· target {verdict.distance} hexes away{/if}
					{:else}
						Not stationed at an airbase · reaches {spec.rangeHexes} hexes once based
					{/if}
				</p>
			{/if}
			{#if verdict && !verdict.ok}
				<p class="text-[11px] text-error" role="status">{verdict.reason}</p>
			{/if}
			<p class="text-[11px] text-fg-muted">
				{AIR_MISSIONS[airMissionKind].blurb} · {AIR_MISSIONS[airMissionKind].fuelCost} fuel · ~{AIR_MISSIONS[
					airMissionKind
				].durationHours}h
			</p>
			<Button type="submit" size="sm" disabled={!verdict?.ok}>Launch mission</Button>
		</form>
		{#if unit}
			<form
				method="POST"
				action="?/rebaseSquadron"
				use:enhance={enhanceForm}
				class="mt-3 space-y-2 border-t border-line/15 pt-2"
			>
				<input type="hidden" name="unitId" value={unit.id} />
				<p class="text-[11px] text-fg-muted">
					Rebase this squadron{#if spec && base}: ferries up to {spec.rangeHexes * 2} hexes per hop{/if}.
				</p>
				<div class="flex items-center gap-2">
					<div class="min-w-0 flex-1">
						<SearchSelect
							name="regionId"
							items={airbaseItems}
							bind:value={rebaseTo}
							showId
							placeholder="Airbase…"
							searchPlaceholder="Search airbases…"
							empty="No other airbase."
						/>
					</div>
					<Button type="submit" size="sm" variant="secondary" disabled={!rebaseTo}>Rebase</Button>
				</div>
			</form>
		{/if}
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
