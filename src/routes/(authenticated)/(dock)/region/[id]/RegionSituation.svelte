<!-- src/routes/(authenticated)/(dock)/region/[id]/RegionSituation.svelte -->
<!-- The region as the viewer's side sees it: the latest recon frame, own
     forces, and hostile forces through fresh intel only (fog of war). -->
<script lang="ts">
	import { Badge, Button, OddsRing } from "#lib/component/ui/index.js";
	import { UnitBadge } from "#lib/component/tactical/index.js";
	import { SENSORS, UNIT_CATEGORIES, type SensorId } from "#lib/config/index.js";
	import { ageLabel } from "#lib/utils/military.js";
	import IconDocument from "~icons/fluent/document-search-20-regular";
	import IconImage from "~icons/fluent/image-multiple-20-regular";
	import IconEyeOff from "~icons/fluent/eye-off-20-regular";
	import { ImageryStrip, SensorImage, type ImageryItem } from "#lib/component/recon/index.js";

	interface Props {
		situation: {
			isHostileRegion: boolean;
			friendly: { unitType: string; count: number; mine: number }[];
			picture: {
				confidence: number;
				level: "none" | "low" | "medium" | "high";
				categories: Record<string, { coverage: number; count: number | null; estimated: boolean }>;
				unitTypes: { unitType: string; count: number; estimated: boolean }[] | null;
				firingPositions: { count: number; confidence: number } | null;
				sensors: { sensor: string }[];
				latestObservedAt: string | null;
			} | null;
			imagery: ImageryItem[];
		};
		hasBattle: boolean;
	}

	let { situation, hasBattle }: Props = $props();

	let now = $state(new Date());
	$effect(() => {
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(t);
	});

	let strip: ImageryStrip | undefined = $state();
	const pic = $derived(situation.picture);
	const latest = $derived(situation.imagery[0] ?? null);
	const showHostile = $derived(situation.isHostileRegion || hasBattle || !!pic);
	const levelTone = { none: "neutral", low: "amber", medium: "blue", high: "green" } as const;
	const ago = (at: string) => (ageLabel(at, now) === "now" ? "just now" : `${ageLabel(at, now)} ago`);
	const LABEL: Record<string, string> = {
		infantry: "Infantry",
		armor: "Armour",
		mechanized: "Mechanised",
		artillery: "Artillery",
		air_defence: "Air defence",
		fighter_squadron: "Fighters",
		bomber_squadron: "Bombers",
		vehicle: "Vehicles",
		air: "Aircraft"
	};
</script>

<section id="region-situation" class="panel rounded-sm p-4 space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="section-title">Situation</h2>
		{#if pic}
			<div class="flex items-center gap-2">
				<Badge tone={levelTone[pic.level]} size="xs">{pic.level} confidence</Badge>
				{#if pic.latestObservedAt}<span class="font-mono text-[11px] text-fg-muted">
						{ago(pic.latestObservedAt)}
					</span>{/if}
			</div>
		{/if}
	</div>

	<div class="grid gap-4 {latest ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}">
		<!-- The latest frame, large -->
		{#if latest}
			<div class="space-y-2 min-w-0">
				<button
					type="button"
					class="group relative block w-full overflow-hidden rounded-sm border border-line/20 bg-black text-left transition-colors hover:border-primary/60"
					onclick={() => strip?.show(latest.input.reportId)}
					aria-label="Open the latest imagery"
				>
					<SensorImage input={latest.input} class={latest.fresh ? "" : "opacity-70"} />
					<span
						class="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-0.5 font-mono text-[10px] text-fg-soft opacity-0 transition-opacity group-hover:opacity-100"
					>
						Open viewer
					</span>
				</button>
				<p class="flex items-center justify-between gap-2 font-mono text-[11px] text-fg-muted">
					<span class="text-primary-fg">
						{SENSORS[latest.input.sensor as SensorId]?.label ?? latest.input.sensor}
					</span>
					<span>{ago(latest.input.observedAt)}{latest.fresh ? "" : " · stale"}</span>
				</p>
				{#if situation.imagery.length > 1}
					<div>
						<p class="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-fg-muted">
							<IconImage class="size-4 text-primary-fg" /> All passes
						</p>
					</div>
				{/if}
				<div class={situation.imagery.length > 1 ? "" : "hidden"}>
					<ImageryStrip bind:this={strip} items={situation.imagery} max={6} />
				</div>
			</div>
		{/if}

		<div class="grid gap-4 content-start {latest ? '' : 'sm:grid-cols-2'}">
			<!-- Own / friendly forces -->
			<div>
				<p class="mb-1.5 text-[10px] uppercase tracking-wide text-fg-muted">Friendly forces</p>
				{#if situation.friendly.length}
					<ul class="flex flex-wrap gap-1.5">
						{#each situation.friendly as u (u.unitType)}
							<li
								class="flex items-center gap-1.5 rounded-full border border-friendly/30 bg-friendly/8 py-0.5 pl-1 pr-2.5 text-xs"
							>
								<UnitBadge affiliation="friend" unitType={u.unitType} count={u.count} size={18} />
								<span class="text-fg-soft">{LABEL[u.unitType] ?? u.unitType}</span>
								{#if u.mine}<span class="font-mono text-[10px] text-friendly-fg">{u.mine} yours</span>{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-fg-muted">None stationed here.</p>
				{/if}
			</div>

			<!-- Hostile forces, through intel only -->
			{#if showHostile}
				<div>
					<p class="mb-1.5 text-[10px] uppercase tracking-wide text-fg-muted">Hostile forces</p>
					{#if pic}
						<div class="flex items-start gap-3">
							<OddsRing value={pic.confidence} size={52} label="Intel confidence" textClass="text-xs" />
							<ul class="min-w-0 flex-1 space-y-1.5">
								{#each UNIT_CATEGORIES as c (c)}
									{@const cat = pic.categories[c]}
									<li class="flex items-center gap-2 text-sm">
										{#if !cat || cat.coverage === 0}
											<UnitBadge affiliation="unknown" size={18} />
											<span class="text-fg-muted">{LABEL[c]}</span>
											<span class="ml-auto font-mono text-[10px] text-fg-faint">not observed</span>
										{:else}
											<UnitBadge
												affiliation="hostile"
												unitType={c}
												count={cat.count ?? 0}
												estimated={cat.estimated}
												size={18}
											/>
											<span class="text-fg-soft">{LABEL[c]}</span>
											<span
												class="ml-auto flex items-center gap-1.5"
												title="Coverage {Math.round(cat.coverage * 100)}%"
											>
												<span class="h-1 w-12 overflow-hidden rounded-full bg-surface-8">
													<span class="block h-full rounded-full bg-hostile" style="width: {cat.coverage * 100}%"
													></span>
												</span>
												<span class="w-8 text-right font-mono text-[10px] text-fg-muted">
													{Math.round(cat.coverage * 100)}%
												</span>
											</span>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
						{#if pic.firingPositions?.count}
							<p class="mt-2 text-xs text-hostile-fg">
								{pic.firingPositions.count} firing position{pic.firingPositions.count === 1 ? "" : "s"} located (thermal)
							</p>
						{/if}
					{:else}
						<div class="flex items-center gap-3 rounded-sm border border-dashed border-line/25 p-3 text-sm">
							<IconEyeOff class="size-6 shrink-0 text-fg-muted" />
							<span class="text-fg-muted">No fresh intel on this region. Task a pass below to see what's here.</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="flex justify-end">
		<Button href="/intel" variant="ghost" size="xs" icon={IconDocument}>Intel reports</Button>
	</div>
</section>
