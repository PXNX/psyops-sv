<!-- src/routes/(authenticated)/(dock)/ops/network/+page.svelte -->
<!-- Network operations: the hands-on layer under cyber ops and psyops. Pick a
     target, plant assets in it, open its sites one at a time (probe, tap the
     cameras, intrude, copy files), cover tracks before the heat burns an
     asset. Side rail: our network there, planting, enemy assets at home. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { fade, slide } from "svelte/transition";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import CameraFeed from "#lib/component/infiltration/CameraFeed.svelte";
	import IntrusionConsole from "#lib/component/infiltration/IntrusionConsole.svelte";
	import FileSystemExplorer from "#lib/component/infiltration/FileSystemExplorer.svelte";
	import CommanderPortrait from "#lib/component/CommanderPortrait.svelte";
	import {
		ASSET_KINDS,
		COVERT_OPS,
		INFILTRATION,
		INFILTRATION_ACTIONS,
		INFILTRATION_ASSETS,
		INTRUSION,
		NETWORK_ASSET_BONUS,
		SITE_TYPES,
		SPY_TRAITS,
		actionChance,
		networkFootholdCap,
		type AssetKind,
		type InfiltrationActionKind,
		type SiteKind
	} from "#lib/config/index.js";
	import { dtg } from "#lib/utils/military.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { vanish } from "#lib/utils/motion.js";
	import IconBack from "~icons/fluent/arrow-left-20-regular";
	import IconLock from "~icons/fluent/document-lock-20-regular";
	import IconCam from "~icons/fluent/video-security-20-regular";
	import IconFactory from "~icons/fluent/building-factory-20-regular";
	import IconPlane from "~icons/fluent/airplane-20-regular";
	import IconServer from "~icons/fluent/server-20-regular";
	import IconNetwork from "~icons/fluent/connected-20-regular";
	import IconPulse from "~icons/fluent/heart-pulse-20-regular";
	import IconShield from "~icons/fluent/shield-20-regular";
	import IconAgent from "~icons/fluent/person-20-regular";
	import IconBug from "~icons/fluent/bug-20-regular";
	import IconKey from "~icons/fluent/key-20-regular";
	import IconFingerprint from "~icons/fluent/fingerprint-20-regular";
	import IconCover from "~icons/fluent/incognito-20-regular";
	import IconOffice from "~icons/fluent/building-20-regular";
	import IconGroup from "~icons/fluent/people-team-20-regular";
	import IconPower from "~icons/fluent/flash-20-regular";
	import IconChevron from "~icons/fluent/chevron-down-20-regular";
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconAlert from "~icons/fluent/warning-20-regular";
	import IconAdd from "~icons/fluent/person-add-20-regular";
	import IconTarget from "~icons/fluent/target-arrow-20-regular";

	type Outcome = {
		success: boolean;
		chance: number;
		detail: string;
		heatAfter: number;
		burned: boolean;
		fileId: number | null;
		siteId: string;
		codename: string;
	};
	type Message = { error?: string; planted?: { codename: string }; outcome?: Outcome };

	let { data, form }: { data: any; form: Message | null } = $props();

	let plantKind = $state<AssetKind>("agent");
	let selectedAssetId = $state<number | null>(null);

	/** Planting cost shown from the same config the action charges. */
	const plantCosts = $derived({ currency: INFILTRATION_ASSETS[plantKind].cost });
	const treasury = $derived<number>(data.treasury ?? 0);
	const available = $derived({ currency: treasury });
	let openSiteId = $state<string | null>(null);
	let openFileId = $state<number | null>(null);
	let lastAction = $state<Outcome | null>(null);
	let lastPayload = $state<any>(null);
	let planting = $state(false);
	let acting = $state<string | null>(null);
	let resultEl: HTMLElement | undefined = $state();

	const targetItems = $derived(
		data.targets.map((t: { id: number; name: string; logo: string | null }) => ({
			id: t.id,
			name: t.name,
			logo: t.logo
		}))
	);
	const targetName = $derived<string>(
		data.targets.find((t: any) => t.id === data.selectedTargetId)?.name ?? "the target"
	);
	// Picking a state opens its dossier straight away.
	let pickedTarget = $state<string | undefined>(undefined);
	$effect(() => {
		pickedTarget = data.selectedTargetId ? String(data.selectedTargetId) : undefined;
	});
	$effect(() => {
		if (pickedTarget && pickedTarget !== String(data.selectedTargetId ?? "")) {
			goto(`/ops/network?target=${pickedTarget}`, { reset: false });
		}
	});

	const activeAssets = $derived(data.assets.filter((a: any) => a.usable));
	const selectedAsset = $derived(
		data.assets.find((a: any) => a.id === selectedAssetId && a.usable) ?? activeAssets[0] ?? null
	);
	const footholds = $derived(Math.min(networkFootholdCap, activeAssets.length));
	const hottest = $derived(activeAssets.reduce((m: number, a: any) => Math.max(m, a.heat), 0));
	const chosenSite = $derived(data.sites.find((s: any) => s.id === openSiteId) ?? null);
	const siteSession = $derived(
		chosenSite && selectedAsset
			? (data.sessions.find((s: any) => s.assetId === selectedAsset.id && s.siteId === chosenSite.id) ?? null)
			: null
	);
	const copiedIds = $derived(
		chosenSite ? data.files.filter((f: any) => f.siteId === chosenSite.id).map((f: any) => f.recordId) : []
	);
	const atCapacity = $derived(activeAssets.length >= INFILTRATION.MAX_ASSETS_PER_TARGET);

	const SITE_ICON: Record<SiteKind, typeof IconFactory> = {
		powerplant: IconPower,
		airbase: IconPlane,
		datacenter: IconServer,
		telecom: IconNetwork,
		lab: IconPulse,
		command: IconShield,
		company: IconOffice,
		factory: IconFactory,
		party: IconGroup
	};
	const ASSET_ICON: Record<AssetKind, typeof IconAgent> = {
		relay: IconNetwork,
		agent: IconAgent,
		botnet: IconBug,
		implant: IconFingerprint,
		insider: IconKey
	};

	const heatTone = (heat: number) =>
		heat >= 75 ? "bg-hostile" : heat >= 45 ? "bg-warning" : heat >= 20 ? "bg-primary" : "bg-positive";
	const heatText = (heat: number) => (heat >= 75 ? "text-hostile-fg" : heat >= 45 ? "text-warning" : "text-fg-soft");

	function oddsFor(kind: InfiltrationActionKind, site: any): number | null {
		if (!selectedAsset) return null;
		const session = data.sessions.find((s: any) => s.assetId === selectedAsset.id && s.siteId === site.id);
		const bonus = session?.stage === "pivot" && kind !== "cover" ? INTRUSION.PIVOT_ACTION_BONUS : 0;
		return Math.round(
			(actionChance(kind, { access: selectedAsset.access, heat: selectedAsset.heat }, site) + bonus) * 100
		);
	}
	function blockedFor(kind: InfiltrationActionKind, site: any): string | null {
		if (!selectedAsset) return "Choose a live asset first.";
		if (kind !== "cover" && selectedAsset.access < site.accessRequired) return `Needs L${site.accessRequired} access.`;
		const cost = INFILTRATION_ACTIONS[kind].cost;
		if (treasury < cost) return `Needs $${cost.toLocaleString()}.`;
		return null;
	}
	const pct = (n: number) => `${n}%`;
	function focusResult() {
		queueMicrotask(() => resultEl?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
	}

	let flippingId = $state<number | null>(null);

	const plantForm = () => {
		planting = true;
		return async ({ result, update }: any) => {
			planting = false;
			await update({ reset: false });
			toastResult(result);
			if (result.type === "success" && result.data?.planted) {
				const planted = result.data.planted;
				selectedAssetId = planted.assetId ?? selectedAssetId;
				celebrate(document.getElementById("network-title")?.closest("section"));
			}
		};
	};
	// `enhance` calls the outer function on submit; the inner one handles the
	// result. Setting `acting` outside that wrapper disabled the button during
	// render, which made "Cover tracks" (and every site action) look dead.
	const actForm = (kind: InfiltrationActionKind, siteId: string) => () => {
		acting = `${kind}-${siteId}`;
		return async ({ result, update }: any) => {
			acting = null;
			await update({ reset: false });
			toastResult(result);
			if (result.type === "success" && result.data?.outcome) {
				const outcome = result.data.outcome as Outcome;
				lastAction = outcome;
				selectedAssetId = data.assets.find((a: any) => a.codename === outcome.codename)?.id ?? selectedAssetId;
				if (outcome.success && kind === "camera") openSiteId = outcome.siteId;
				if (outcome.fileId) openFileId = outcome.fileId;
				focusResult();
			}
		};
	};
</script>

<svelte:head>
	<title>Network operations · PsyOps</title>
</svelte:head>

{#snippet heatBar(heat: number)}
	<div class="flex items-center gap-2" title="Heat: how close the asset is to being burned">
		<div class="h-1 flex-1 overflow-hidden rounded-full bg-surface-7">
			<div class="h-full rounded-full {heatTone(heat)} transition-[width]" style:width={pct(heat)}></div>
		</div>
		<span class="data w-12 text-right text-[11px] {heatText(heat)}">Heat {heat}</span>
	</div>
{/snippet}

{#snippet actionResult(a: Outcome)}
	<div class="flex items-start gap-2 text-sm" bind:this={resultEl} in:fade={{ duration: 150 }}>
		<Badge size="xs" tone={a.success ? "green" : "red"}>{a.success ? "Success" : "Failed"}</Badge>
		<div class="min-w-0">
			<p class="text-fg-body">{a.detail}</p>
			<p class="data text-[11px] text-fg-muted">
				{a.codename} · chance {a.chance}% · heat now {a.heatAfter}{#if a.burned}<span class="text-hostile-fg">
						· asset burned
					</span>{/if}
			</p>
		</div>
	</div>
{/snippet}

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div class="min-w-0">
			<a href="/ops" class="mb-1 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-primary-fg">
				<IconBack class="size-3.5" /> Covert operations
			</a>
			<p class="section-title">J3 · Access & influence</p>
			<h1 class="mt-1 text-2xl font-semibold text-fg">Network operations</h1>
			{#if data.state}
				<p class="mt-0.5 text-sm text-fg-muted">
					{data.state.name}{data.authority ? ` · ${data.authority.roleLabel}` : ""}
				</p>
			{/if}
		</div>
		<div class="flex w-full flex-wrap items-end gap-2 sm:w-auto">
			{#if data.authority && data.targets.length}
				<form method="GET" class="flex min-w-0 flex-1 items-end gap-2 sm:w-72 sm:flex-none">
					<div class="min-w-0 flex-1">
						<label class="sr-only" for="net-target">Target state</label>
						<SearchSelect
							id="net-target"
							name="target"
							items={targetItems}
							bind:value={pickedTarget}
							showId
							placeholder="Choose a target…"
							searchPlaceholder="Search states…"
						/>
					</div>
				</form>
			{/if}
		</div>
	</header>

	{#if !data.authority}
		<p class="mt-6 text-sm text-fg-muted">
			Networks are run by your state's president, defence minister or foreign minister. What your state knows about
			operations against it is on the <a class="text-primary-fg hover:underline" href="/ops">operations console</a>.
		</p>
	{:else if !data.targets.length}
		<p class="mt-6 text-sm text-fg-muted">
			There is no state to build a network in yet. Your own state and bloc partners are off limits.
		</p>
	{:else}
		<!-- Status strip -->
		<dl class="panel mt-5 grid grid-cols-2 sm:grid-cols-4">
			<div class="p-3 sm:px-4">
				<dt class="section-title">Treasury</dt>
				<dd class="data mt-1 text-xl text-fg">${treasury.toLocaleString()}</dd>
			</div>
			<div class="border-l border-line/15 p-3 sm:px-4">
				<dt class="section-title">Assets in {targetName}</dt>
				<dd class="data mt-1 text-xl text-fg">
					{activeAssets.length}<span class="text-sm text-fg-faint">/{INFILTRATION.MAX_ASSETS_PER_TARGET}</span>
				</dd>
				<dd class="text-[11px] text-fg-faint">
					{footholds}/{networkFootholdCap} count as footholds
				</dd>
			</div>
			<div class="border-t border-line/15 p-3 sm:border-t-0 sm:border-l sm:px-4">
				<dt class="section-title">Hottest asset</dt>
				<dd class="data mt-1 text-xl {activeAssets.length ? heatText(hottest) : 'text-fg-faint'}">
					{activeAssets.length ? hottest : "—"}
				</dd>
				<dd class="text-[11px] text-fg-faint">{hottest >= 75 ? "Cover tracks now" : "Heat out of 100"}</dd>
			</div>
			<div class="border-t border-l border-line/15 p-3 sm:border-t-0 sm:px-4">
				<dt class="section-title">Dossier</dt>
				<dd class="data mt-1 text-xl text-fg">{data.files.length}</dd>
				<dd class="text-[11px] text-fg-faint">files copied</dd>
			</div>
		</dl>

		{#if form?.error}
			<p class="mt-3 flex items-center gap-1.5 text-sm text-error" role="alert">
				<IconAlert class="size-4 shrink-0" />{form.error}
			</p>
		{/if}

		<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
			<!-- ── Side rail: our network, planting, enemy assets ─────────── -->
			<div class="min-w-0 space-y-6 lg:col-start-2 lg:row-start-1">
				<section class="panel" aria-labelledby="network-title">
					<h2 id="network-title" class="section-title px-4 pt-3 pb-2">
						<IconNetwork class="size-4" /> Network in {targetName}
						<span class="data ml-auto tracking-normal normal-case">
							{activeAssets.length}/{INFILTRATION.MAX_ASSETS_PER_TARGET}
						</span>
					</h2>
					{#if data.assets.length}
						<ul class="divide-y divide-line/10 border-t border-line/15">
							{#each data.assets as asset (asset.id)}
								{@const selected = selectedAsset?.id === asset.id}
								<li
									class="px-4 py-3 transition-colors {selected
										? 'bg-primary/10 shadow-[inset_3px_0_0_var(--color-primary)]'
										: ''}"
								>
									<button
										type="button"
										onclick={() => (selectedAssetId = asset.id)}
										disabled={!asset.usable}
										aria-pressed={selected}
										class="flex w-full items-start gap-3 text-left disabled:opacity-50"
									>
										<CommanderPortrait seed={asset.portrait} alive={asset.status === "active"} size={36} />
										<span class="min-w-0 flex-1">
											<span class="flex items-center justify-between gap-2">
												<span class="truncate font-medium text-fg">
													{asset.name} <span class="font-normal text-fg-muted">“{asset.codename}”</span>
												</span>
												{#if asset.compromised}
													<Badge size="xs" tone="red">Double agent</Badge>
												{:else if asset.status === "burned"}
													<Badge size="xs" tone="red">Burned</Badge>
												{:else}
													<Badge size="xs" tone="blue" class="data">L{asset.access}</Badge>
												{/if}
											</span>
											<span class="block truncate text-xs text-fg-muted">
												{INFILTRATION_ASSETS[asset.kind as AssetKind]?.label ?? "Asset"} · {asset.handler ??
													"Unknown handler"}
											</span>
											{#if asset.traitIds.length}
												<span class="mt-1 flex flex-wrap gap-1">
													{#each asset.traitIds as traitId (traitId)}
														{@const trait = SPY_TRAITS[traitId as keyof typeof SPY_TRAITS]}
														{#if trait}
															<Badge size="xs" tone="cyan" class="cursor-help">
																<span title={trait.description}>{trait.label}</span>
															</Badge>
														{/if}
													{/each}
												</span>
											{/if}
											<span class="mt-1.5 block">{@render heatBar(asset.heat)}</span>
										</span>
									</button>
									{#if asset.usable}
										<form
											method="POST"
											action="?/act"
											class="mt-1.5 flex items-center justify-end gap-3 pl-12"
											use:enhance={actForm("cover", "")}
										>
											<input type="hidden" name="assetId" value={asset.id} />
											<input type="hidden" name="action" value="cover" />
											<ResourceRequirements
												inline
												title="Cover tracks cost"
												costs={{ currency: INFILTRATION_ACTIONS.cover.cost, heat: INFILTRATION_ACTIONS.cover.heat }}
												{available}
											/>
											<button
												type="submit"
												disabled={treasury < INFILTRATION_ACTIONS.cover.cost || acting === `cover-`}
												class="inline-flex items-center gap-1 text-xs text-fg-soft hover:text-primary-fg disabled:opacity-40"
											>
												<IconCover class="size-3.5" /> Cover tracks
											</button>
										</form>
										{#if lastAction && lastAction.siteId === "" && lastAction.codename === asset.codename}
											<div class="mt-2 pl-12">{@render actionResult(lastAction)}</div>
										{/if}
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="border-t border-line/15 px-4 py-3 text-sm text-fg-muted">
							No assets here yet. Plant one below for a first foothold.
						</p>
					{/if}
					<div class="border-t border-line/15 px-4 py-2.5">
						<Button
							variant="ghost"
							size="sm"
							block
							href="/ops?target={data.selectedTargetId}"
							disabled={footholds === 0}
							icon={IconTarget}
						>
							Plan an operation with these footholds
						</Button>
					</div>
				</section>

				<form method="POST" action="?/plant" class="panel" use:enhance={plantForm}>
					<input type="hidden" name="targetStateId" value={data.selectedTargetId} />
					<h3
						class="section-title px-4 pt-3 pb-2"
						title="Each live foothold adds +{Math.round(
							NETWORK_ASSET_BONUS.SUCCESS_PER_ASSET * 100
						)}% success and −{Math.round(
							NETWORK_ASSET_BONUS.ATTRIBUTION_PER_ASSET * 100
						)}% attribution to cyber operations and psyops (max {NETWORK_ASSET_BONUS.CAP})."
					>
						<IconAdd class="size-4" /> Plant an asset
					</h3>
					<fieldset class="min-w-0 divide-y divide-line/10 border-y border-line/15">
						<legend class="sr-only">Asset type</legend>
						{#each ASSET_KINDS as kind (kind)}
							{@const spec = INFILTRATION_ASSETS[kind]}
							{@const Icon = ASSET_ICON[kind]}
							<label
								class="group flex cursor-pointer items-start gap-3 px-4 py-2 transition-colors hover:bg-surface-5 has-[:checked]:bg-primary/10 has-[:checked]:shadow-[inset_3px_0_0_var(--color-primary)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60 has-[:focus-visible]:ring-inset"
							>
								<input type="radio" name="kind" value={kind} bind:group={plantKind} class="sr-only" />
								<Icon class="mt-0.5 size-4 shrink-0 text-fg-muted group-has-[:checked]:text-primary-fg" />
								<span class="min-w-0 flex-1">
									<span class="flex items-center justify-between gap-2">
										<span class="text-sm font-medium text-fg">{spec.label}</span>
										<span class="flex items-center gap-2">
											<ResourceRequirements inline costs={{ currency: spec.cost }} {available} />
											<span class="data text-[11px] text-fg-muted" title="Access level">L{spec.access}</span>
										</span>
									</span>
									<span class="block truncate text-xs text-fg-muted" title={spec.blurb}>{spec.blurb}</span>
								</span>
							</label>
						{/each}
					</fieldset>
					<div class="space-y-3 p-4">
						<ResourceRequirements title="Planting cost" costs={plantCosts} {available} />
						<Button
							type="submit"
							variant="primary"
							block
							loading={planting}
							loadingText="Planting…"
							disabled={atCapacity || treasury < INFILTRATION_ASSETS[plantKind].cost}
						>
							{atCapacity
								? `Network full (${INFILTRATION.MAX_ASSETS_PER_TARGET} assets)`
								: `Plant ${INFILTRATION_ASSETS[plantKind].label.toLowerCase()}`}
						</Button>
					</div>
				</form>

				<section class="panel p-4" aria-labelledby="enemy-title">
					<h3
						id="enemy-title"
						class="section-title mb-2"
						title="Turning one is a long shot, but a double agent brings files."
					>
						<IconAlert class="size-4" /> Enemy assets in {data.state.name}
					</h3>
					{#if data.enemyAssets.length}
						<ul class="divide-y divide-line/10">
							{#each data.enemyAssets as enemy (enemy.id)}
								<li class="flex items-center gap-3 py-2">
									<CommanderPortrait seed={enemy.portrait} alive={!enemy.doubleAgent} size={32} />
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-fg">
											{enemy.name} <span class="font-normal text-fg-muted">“{enemy.codename}”</span>
										</p>
										<p class="truncate text-xs text-fg-muted">
											{INFILTRATION_ASSETS[enemy.kind as AssetKind]?.label ?? "Asset"} · {enemy.owner} ·
											<span class="data {heatText(enemy.heat)}">heat {enemy.heat}</span>
										</p>
									</div>
									{#if enemy.doubleAgent}
										<Badge size="xs" tone="green">Ours now</Badge>
									{:else}
										<form
											method="POST"
											action="?/flip"
											use:enhance={() => {
												flippingId = enemy.id;
												return async ({ result, update }) => {
													flippingId = null;
													await update({ reset: false });
													toastResult(result);
												};
											}}
										>
											<input type="hidden" name="assetId" value={enemy.id} />
											<Button
												type="submit"
												size="xs"
												variant="secondary"
												loading={flippingId === enemy.id}
												disabled={treasury < INFILTRATION.FLIP_COST}
												title="Try to turn this asset into a double agent"
											>
												Turn · <span class="data">${INFILTRATION.FLIP_COST.toLocaleString()}</span>
											</Button>
										</form>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm text-fg-muted">No hostile assets known to be operating here.</p>
					{/if}
				</section>
			</div>

			<!-- ── Main: sites, dossier, log ──────────────────────────────── -->
			<div class="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
				<section class="panel" aria-labelledby="sites-title">
					<h2 id="sites-title" class="section-title px-4 pt-3 pb-2">
						<IconTarget class="size-4" /> Sites in {targetName}
						{#if selectedAsset}
							<span class="ml-auto tracking-normal normal-case">
								Operator <span class="text-fg-soft">“{selectedAsset.codename}”</span>
							</span>
						{/if}
					</h2>
					{#if data.sites.length}
						<ul class="divide-y divide-line/10 border-t border-line/15">
							{#each data.sites as site (site.id)}
								{@const Icon = SITE_ICON[site.kind as SiteKind] ?? IconShield}
								{@const open = openSiteId === site.id}
								<li>
									<button
										type="button"
										onclick={() => (openSiteId = open ? null : site.id)}
										aria-expanded={open}
										class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-5 {open
											? 'bg-surface-5'
											: ''}"
									>
										<span
											class="grid size-8 shrink-0 place-items-center rounded-sm {open
												? 'bg-primary/20 text-primary-fg'
												: 'bg-surface-7 text-fg-soft'}"
										>
											<Icon class="size-4" />
										</span>
										<span class="min-w-0 flex-1">
											<span class="block truncate font-medium text-fg">{site.name}</span>
											<span class="block truncate text-xs text-fg-muted">
												{SITE_TYPES[site.kind as SiteKind]?.label ?? "Site"} · {site.region}
												<span class="data text-fg-faint">· {site.code}</span>
											</span>
										</span>
										<span class="flex shrink-0 items-center gap-1.5">
											{#if site.files > 0}
												<Badge size="xs" tone="amber" icon={IconLock}>{site.files}</Badge>
											{/if}
											{#if site.cameras > 0}
												<Badge size="xs" tone="blue" icon={IconCam}>{site.cameras}</Badge>
											{/if}
											{#if site.known}
												<Badge size="xs" tone="green" class="data">Sec L{site.security}</Badge>
											{:else}
												<Badge size="xs" tone="neutral">Unprobed</Badge>
											{/if}
											<IconChevron class="size-4 text-fg-muted transition-transform {open ? 'rotate-180' : ''}" />
										</span>
									</button>

									{#if open}
										<div class="space-y-4 bg-surface-3 px-4 py-4" transition:slide={{ duration: 160 }}>
											<div class="flex flex-wrap items-start justify-between gap-3">
												<p class="max-w-prose text-xs text-fg-muted">{site.blurb}</p>
												<dl class="flex gap-4 text-xs">
													<div>
														<dt class="section-title">Security</dt>
														<dd class="data text-fg">{site.known ? `L${site.security}` : "Probe to learn"}</dd>
													</div>
													<div>
														<dt class="section-title">Access</dt>
														<dd class="data text-fg">L{site.accessRequired}</dd>
													</div>
													<div>
														<dt class="section-title">Last seen</dt>
														<dd class="data text-fg">{site.lastSeen ? dtg(site.lastSeen) : "Never"}</dd>
													</div>
												</dl>
											</div>

											<!-- Quick actions -->
											<div class="grid gap-2 sm:grid-cols-3">
												{#each ["probe", "camera", "files"] as const as kind (kind)}
													{@const spec = INFILTRATION_ACTIONS[kind]}
													{@const blocked = blockedFor(kind, site)}
													{@const chance = oddsFor(kind, site)}
													<form method="POST" action="?/act" use:enhance={actForm(kind, site.id)}>
														<input type="hidden" name="assetId" value={selectedAsset?.id ?? ""} />
														<input type="hidden" name="siteId" value={site.id} />
														<input type="hidden" name="action" value={kind} />
														<Button
															type="submit"
															size="sm"
															variant={kind === "files" ? "secondary" : "subtle"}
															block
															disabled={!!blocked}
															loading={acting === `${kind}-${site.id}`}
															title={spec.blurb}
														>
															{spec.label}{#if chance !== null}<span class="data ml-1 opacity-70">{chance}%</span>{/if}
														</Button>
														<div class="mt-1 flex justify-center">
															{#if blocked}
																<p class="text-[11px] text-error">{blocked}</p>
															{:else}
																<ResourceRequirements
																	inline
																	costs={{ currency: spec.cost, heat: spec.heat }}
																	{available}
																/>
															{/if}
														</div>
													</form>
												{/each}
											</div>

											{#if lastAction && lastAction.siteId === site.id}
												{@render actionResult(lastAction)}
											{/if}

											{#if site.cameras > 0}
												<CameraFeed {site} observedAt={site.lastSeen ?? undefined} />
											{/if}

											{#if selectedAsset}
												<div>
													<h4 class="section-title mb-2">Operator terminal · “{selectedAsset.codename}”</h4>
													<IntrusionConsole
														session={siteSession}
														{site}
														asset={selectedAsset}
														{treasury}
														onResult={(d) => {
															if (d?.payload) {
																lastPayload = d.payload;
																focusResult();
															}
														}}
													/>
												</div>
											{:else}
												<p class="text-sm text-fg-muted">Plant an asset to work this site from the inside.</p>
											{/if}

											{#if lastPayload}
												<div class="flex items-start gap-2 text-sm" bind:this={resultEl} in:fade={{ duration: 150 }}>
													<Badge size="xs" tone={lastPayload.succeeded ? "green" : "red"}>
														{lastPayload.succeeded ? "Deployed" : "Blocked"}
													</Badge>
													<p class="text-fg-body">
														{COVERT_OPS[lastPayload.kind as keyof typeof COVERT_OPS]?.label ?? "Payload"} against
														{lastPayload.target}:
														<span class="data">
															success {lastPayload.successChance}% · traced {lastPayload.attributionChance}%
														</span>.
														{#if lastPayload.stolen}
															<span class="data">${lastPayload.stolen.kept.toLocaleString()}</span> reached our treasury.
														{/if}
													</p>
												</div>
											{/if}

											{#if siteSession?.stage === "pivot" && selectedAsset}
												<div>
													<h4 class="section-title mb-2">Inside the host · {site.code}</h4>
													<FileSystemExplorer
														{site}
														assetId={selectedAsset.id}
														{targetName}
														{copiedIds}
														onResult={(d) => {
															if (d?.exfil) focusResult();
														}}
													/>
												</div>
											{/if}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="border-t border-line/15 px-4 py-3 text-sm text-fg-muted">No known sites in {targetName}.</p>
					{/if}
				</section>

				<!-- Dossier -->
				<section class="panel" aria-labelledby="dossier-title">
					<h2 id="dossier-title" class="section-title px-4 pt-3 pb-2">
						<IconLock class="size-4" /> Dossier
						<span class="data ml-auto tracking-normal normal-case">{data.files.length} files</span>
					</h2>
					{#if data.files.length}
						<div class="divide-y divide-line/10 border-t border-line/15">
							{#each data.files as file (file.id)}
								<button
									type="button"
									onclick={() => (openFileId = openFileId === file.id ? null : file.id)}
									aria-expanded={openFileId === file.id}
									class="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-5"
								>
									<span class="min-w-0">
										<span class="block truncate text-sm font-medium text-fg">{file.title}</span>
										<span class="data block truncate text-[11px] text-fg-muted">
											{file.path ?? file.siteId} · {dtg(file.capturedAt)}
										</span>
									</span>
									<Badge
										size="xs"
										tone={file.classification === "TOP SECRET"
											? "red"
											: file.classification === "SECRET"
												? "orange"
												: "amber"}
									>
										{file.classification}
									</Badge>
								</button>
								{#if openFileId === file.id}
									<div class="bg-surface-3 px-4 py-3" transition:slide={{ duration: 140 }}>
										<p class="mb-2 font-mono text-[10px] tracking-[0.18em] text-hostile-fg uppercase">
											{file.classification} // copied via network asset
										</p>
										<div class="text-sm leading-relaxed whitespace-pre-line text-fg-soft">{file.body}</div>
									</div>
								{/if}
							{/each}
						</div>
					{:else}
						<p class="border-t border-line/15 px-4 py-3 text-sm text-fg-muted">
							Nothing copied yet. Open a site and pull its files.
						</p>
					{/if}
				</section>

				<!-- Activity log -->
				<section class="panel p-4" aria-labelledby="log-title">
					<h2 id="log-title" class="section-title mb-1"><IconHistory class="size-4" /> Activity log</h2>
					{#if data.actions.length}
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="text-left text-[11px] tracking-[0.12em] text-fg-muted uppercase">
										<th class="py-2 pr-3 font-semibold">When</th>
										<th class="py-2 pr-3 font-semibold">Asset</th>
										<th class="py-2 pr-3 font-semibold">Action</th>
										<th class="py-2 pr-3 font-semibold">Detail</th>
										<th class="py-2 text-right font-semibold">Heat</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-line/15">
									{#each data.actions as entry (entry.action.id)}
										<tr class="align-top" out:vanish>
											<td class="data py-2 pr-3 text-xs whitespace-nowrap text-fg-muted">
												{dtg(entry.action.createdAt)}
											</td>
											<td class="py-2 pr-3 whitespace-nowrap text-fg">“{entry.codename}”</td>
											<td class="py-2 pr-3">
												<Badge size="xs" tone={entry.action.success ? "green" : "neutral"}>
													{INFILTRATION_ACTIONS[entry.action.action as InfiltrationActionKind]?.label ??
														entry.action.action}
												</Badge>
											</td>
											<td class="min-w-48 py-2 pr-3 text-xs text-fg-soft">{entry.action.detail}</td>
											<td class="data py-2 text-right text-xs {heatText(entry.action.heatAfter)}">
												{entry.action.heatAfter}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="py-2 text-sm text-fg-muted">No network activity yet. Probe a site to start.</p>
					{/if}
				</section>
			</div>
		</div>
	{/if}
</PageContainer>
