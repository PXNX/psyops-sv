<!-- src/routes/(authenticated)/(dock)/civic/CivicProjectCard.svelte -->
<!-- One building the patron paid for: its illustration and tier, where it
     stands, what it is worth after the region's saturation, the build or
     expansion progress, and the two things to do with it next: expand it or
     put a name on its plaque. -->
<script lang="ts">
	import { enhance, type SubmitFunction } from "$app/forms";
	import { slide } from "svelte/transition";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import ConstructionProgress from "#lib/component/ConstructionProgress.svelte";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { dtgDate } from "#lib/utils/dtg.js";
	import { CIVIC_BUILDINGS, CIVIC_TIERS, isCivicBuildingType } from "#lib/config/game/civic.config.js";
	import CivicArt from "./CivicArt.svelte";
	import IconExpand from "~icons/fluent/arrow-circle-up-20-regular";
	import IconPlaque from "~icons/fluent/signature-20-regular";
	import IconLocation from "~icons/fluent/location-20-regular";
	import IconStar from "~icons/fluent/star-20-regular";

	interface Project {
		id: number;
		buildingType: string;
		regionId: number;
		regionName: string;
		startedAt: Date | string;
		completesAt: Date | string;
		completedAt: Date | string | null;
		tier: number;
		upgradeCompletesAt: Date | string | null;
		upgradedAt: Date | string | null;
		plaque: string | null;
		value: number;
		goodwill: number;
		multiplier: number | null;
		invested: number;
		upgrade: { tier: number; cost: number; days: number; value: number } | null;
	}

	interface Props {
		project: Project;
		wallet: number;
		plaqueCost: number;
		plaqueMax: number;
		plaqueBonus: number;
	}
	let { project, wallet, plaqueCost, plaqueMax, plaqueBonus }: Props = $props();

	const building = $derived(isCivicBuildingType(project.buildingType) ? CIVIC_BUILDINGS[project.buildingType] : null);
	const tierLabel = $derived(CIVIC_TIERS[project.tier - 1]?.label ?? "Founded");
	const open = $derived(!!project.completedAt);
	const expanding = $derived(!!project.upgradeCompletesAt);
	const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
	const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-US");

	let naming = $state(false);
	let plaque = $state("");
	let busy = $state<"upgrade" | "dedicate" | null>(null);

	const submit =
		(kind: "upgrade" | "dedicate"): SubmitFunction =>
		() => {
			busy = kind;
			return async ({ result, update }) => {
				busy = null;
				await update();
				toastResult(result);
				if (kind === "dedicate" && result.type === "success") naming = false;
			};
		};
</script>

<article class="panel flex h-full min-w-0 flex-col overflow-hidden">
	<div class="flex items-start gap-3 border-b border-line/15 bg-linear-to-br from-positive/10 to-transparent p-3">
		<span class="grid size-14 shrink-0 place-items-center rounded-sm bg-surface-2">
			<CivicArt
				kind="building"
				variant={project.buildingType}
				tier={project.tier}
				class="size-12"
				label="{building?.name ?? 'Building'}, {tierLabel.toLowerCase()}"
			/>
		</span>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-1.5">
				<h3 class="truncate font-semibold text-fg">{building?.name ?? project.buildingType}</h3>
				<Badge tone={project.tier >= 3 ? "amber" : project.tier === 2 ? "blue" : "neutral"} size="xs" icon={IconStar}>
					{tierLabel}
				</Badge>
			</div>
			<a
				href="/region/{project.regionId}"
				class="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-fg-muted hover:text-primary-fg"
			>
				<IconLocation class="size-3.5 shrink-0" /><span class="truncate">{project.regionName}</span>
			</a>
		</div>
		<div class="shrink-0 text-right">
			{#if open}
				<p class="data text-lg leading-none text-positive-fg">+{fmt(project.goodwill)}</p>
				<p class="mt-1 text-[10px] text-fg-faint">
					{#if project.multiplier != null && project.multiplier < 1}
						{project.value} × {Math.round(project.multiplier * 100)}%
					{:else}
						goodwill
					{/if}
				</p>
			{:else}
				<p class="data text-lg leading-none text-fg-muted">+{project.value}</p>
				<p class="mt-1 text-[10px] text-fg-faint">on opening</p>
			{/if}
		</div>
	</div>

	<div class="flex flex-1 flex-col gap-3 p-3">
		{#if project.plaque}
			<p
				class="rounded-sm border border-warning/40 bg-warning/10 px-3 py-1.5 text-center font-serif text-sm text-fg italic"
				title="Plaque · +{plaqueBonus} opinion"
			>
				“{project.plaque}”
			</p>
		{/if}

		{#if !open}
			<ConstructionProgress startedAt={project.startedAt} completesAt={project.completesAt} compact />
		{:else if expanding && project.upgrade}
			<div>
				<p class="mb-1 text-[11px] text-fg-muted">
					Expanding to {CIVIC_TIERS[project.upgrade.tier - 1]?.label.toLowerCase()} · +{project.upgrade.value} when done
				</p>
				<ConstructionProgress
					startedAt={project.upgradedAt ?? project.completedAt}
					completesAt={project.upgradeCompletesAt}
					compact
				/>
			</div>
		{/if}

		<dl class="data mt-auto grid grid-cols-2 gap-2 text-[11px]">
			<div>
				<dt class="text-fg-faint">Invested</dt>
				<dd class="text-fg-soft">{money(project.invested)}</dd>
			</div>
			<div class="text-right">
				<dt class="text-fg-faint">{open ? "Opened" : "Opens"}</dt>
				<dd class="text-fg-soft">{dtgDate(project.completedAt ?? project.completesAt)}</dd>
			</div>
		</dl>

		{#if open}
			<div class="flex flex-wrap gap-2">
				{#if project.upgrade && !expanding}
					<form method="POST" action="?/upgrade" class="min-w-0 flex-1" use:enhance={submit("upgrade")}>
						<input type="hidden" name="projectId" value={project.id} />
						<Button
							type="submit"
							variant="soft-blue"
							size="sm"
							block
							icon={IconExpand}
							loading={busy === "upgrade"}
							disabled={wallet < project.upgrade.cost}
							title="{project.upgrade.days} days of work · worth +{project.upgrade.value} afterwards"
						>
							Expand · {money(project.upgrade.cost)}
						</Button>
					</form>
				{/if}
				<Button
					variant="soft-amber"
					size="sm"
					grow
					icon={IconPlaque}
					aria-expanded={naming}
					onclick={() => {
						naming = !naming;
						plaque = project.plaque ?? "";
					}}
				>
					{project.plaque ? "Re-engrave" : "Name it"}
				</Button>
			</div>
			{#if naming}
				<form
					method="POST"
					action="?/dedicate"
					class="space-y-2 rounded-sm bg-surface-2 p-2"
					transition:slide={{ duration: 150 }}
					use:enhance={submit("dedicate")}
				>
					<input type="hidden" name="projectId" value={project.id} />
					<label class="field-label" for="plaque-{project.id}">
						Plaque inscription · {money(plaqueCost)}{project.plaque ? "" : `, +${plaqueBonus} opinion`}
					</label>
					<input
						id="plaque-{project.id}"
						name="plaque"
						bind:value={plaque}
						maxlength={plaqueMax}
						required
						placeholder="The Founders' Hall"
						class="field-control w-full rounded-sm px-3 py-2 font-serif"
					/>
					<div class="flex items-center justify-between gap-2">
						<span class="data text-[10px] text-fg-faint">{plaque.length}/{plaqueMax}</span>
						<Button
							type="submit"
							variant="primary"
							size="sm"
							loading={busy === "dedicate"}
							disabled={wallet < plaqueCost || plaque.trim().length < 3}
						>
							Unveil
						</Button>
					</div>
				</form>
			{/if}
		{/if}
	</div>
</article>
