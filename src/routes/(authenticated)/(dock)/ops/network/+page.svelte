<!-- src/routes/(authenticated)/(dock)/ops/network/+page.svelte -->
<!-- Network operations: the hands-on layer under cyber ops and psyops. Pick a
     target, plant assets in it, open its sites one at a time from a grid of
     site cards (probe, tap the cameras, intrude, copy files), cover tracks
     before the heat burns an asset. Side rail: planting and enemy assets at
     home. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { fade, slide } from "svelte/transition";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import CameraWall from "#lib/component/infiltration/CameraWall.svelte";
	import IntrusionConsole from "#lib/component/infiltration/IntrusionConsole.svelte";
	import FileSystemExplorer from "#lib/component/infiltration/FileSystemExplorer.svelte";
	import SpyPortrait from "#lib/component/infiltration/SpyPortrait.svelte";
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
	import { countdown, dtg } from "#lib/utils/military.js";
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
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconAlert from "~icons/fluent/warning-20-regular";
	import IconAdd from "~icons/fluent/person-add-20-regular";
	import IconTarget from "~icons/fluent/target-arrow-20-regular";
	import IconWallet from "~icons/fluent/wallet-20-regular";
	import IconFire from "~icons/fluent/fire-20-regular";
	import IconClose from "~icons/fluent/dismiss-20-regular";
	import IconStar from "~icons/fluent/star-20-filled";
	import OddsRing from "../OddsRing.svelte";

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

	// A ticking clock for the recruitment cooldown and burned-asset timers.
	let clock = $state(new Date());
	$effect(() => {
		const timer = setInterval(() => (clock = new Date()), 30_000);
		return () => clearInterval(timer);
	});
	const plantWait = $derived(data.plantReadyAt ? countdown(data.plantReadyAt, clock) : null);

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
	const heatColor = (heat: number) =>
		heat >= 75
			? "var(--color-hostile)"
			: heat >= 45
				? "var(--color-warning)"
				: heat >= 20
					? "var(--color-primary)"
					: "var(--color-positive)";
	const money = (n: number) =>
		n >= 1_000_000
			? `$${+(n / 1_000_000).toFixed(1)}M`
			: n >= 1000
				? `$${+(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`
				: `$${n}`;
	const CLASS_TONE: Record<string, string> = {
		"TOP SECRET": "border-hostile",
		SECRET: "border-orange-400",
		CONFIDENTIAL: "border-warning"
	};
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

{#snippet actionResult(a: Outcome)}
	<div
		class="flex items-start gap-2.5 rounded-sm border-l-2 px-3 py-2 text-sm {a.success
			? 'border-positive bg-positive/5'
			: 'border-hostile bg-hostile/5'}"
		bind:this={resultEl}
		in:fade={{ duration: 150 }}
	>
		<Badge size="xs" tone={a.success ? "green" : "red"}>{a.success ? "Success" : "Failed"}</Badge>
		<div class="min-w-0">
			<p class="text-fg-body">{a.detail}</p>
			<p class="data mt-0.5 text-[11px] text-fg-muted">
				“{a.codename}” · {a.chance}% · heat {a.heatAfter}{#if a.burned}<span class="text-hostile-fg">
						· burned
					</span>{/if}
			</p>
		</div>
	</div>
{/snippet}

{#snippet emptyState(Icon: typeof IconLock, text: string)}
	<div class="flex flex-col items-center gap-1.5 py-6 text-center">
		<Icon class="size-7 text-fg-faint" />
		<p class="text-xs text-fg-muted">{text}</p>
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
		{#if data.authority && data.targets.length}
			<form method="GET" class="w-full min-w-0 sm:w-72">
				<label class="field-label flex items-center gap-1.5" for="net-target">
					<IconTarget class="size-4 text-fg-muted" /> Target state
				</label>
				<SearchSelect
					id="net-target"
					name="target"
					items={targetItems}
					bind:value={pickedTarget}
					showId
					placeholder="Choose a target…"
					searchPlaceholder="Search states…"
				/>
			</form>
		{/if}
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
		<!-- Status tiles -->
		<dl class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
			<div class="panel flex items-center gap-3 p-3">
				<span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-fg">
					<IconWallet class="size-5" />
				</span>
				<div class="min-w-0">
					<dt class="section-title">Treasury</dt>
					<dd class="data truncate text-lg text-fg">{money(treasury)}</dd>
				</div>
			</div>
			<div class="panel flex items-center gap-3 p-3">
				<OddsRing
					value={activeAssets.length / INFILTRATION.MAX_ASSETS_PER_TARGET}
					segments={INFILTRATION.MAX_ASSETS_PER_TARGET}
					color="var(--color-primary)"
					size={40}
					label="Assets in {targetName}"
				>
					<IconNetwork class="size-4 text-fg-muted" />
				</OddsRing>
				<div class="min-w-0">
					<dt class="section-title truncate">Assets</dt>
					<dd class="data text-lg text-fg">
						{activeAssets.length}<span class="text-sm text-fg-faint">/{INFILTRATION.MAX_ASSETS_PER_TARGET}</span>
					</dd>
					<dd class="text-[11px] text-fg-faint">{footholds}/{networkFootholdCap} footholds</dd>
				</div>
			</div>
			<div class="panel flex items-center gap-3 p-3" title="Heat: how close an asset is to being burned">
				<OddsRing
					value={hottest / 100}
					color={heatColor(hottest)}
					dim={!activeAssets.length}
					size={40}
					label="Hottest asset heat"
				>
					<IconFire class="size-4 {activeAssets.length ? heatText(hottest) : 'text-fg-faint'}" />
				</OddsRing>
				<div class="min-w-0">
					<dt class="section-title">Hottest</dt>
					<dd class="data text-lg {activeAssets.length ? heatText(hottest) : 'text-fg-faint'}">
						{activeAssets.length ? hottest : "—"}<span class="text-sm text-fg-faint">/100</span>
					</dd>
					{#if hottest >= 75}<dd class="text-[11px] text-hostile-fg">Cover tracks now</dd>{/if}
				</div>
			</div>
			<div class="panel flex items-center gap-3 p-3">
				<span
					class="grid size-10 shrink-0 place-items-center rounded-full {data.files.length
						? 'bg-warning/15 text-warning'
						: 'bg-surface-7 text-fg-muted'}"
				>
					<IconLock class="size-5" />
				</span>
				<div class="min-w-0">
					<dt class="section-title">Dossier</dt>
					<dd class="data text-lg text-fg">{data.files.length}</dd>
					<dd class="text-[11px] text-fg-faint">files copied</dd>
				</div>
			</div>
		</dl>

		{#if form?.error}
			<p class="mt-3 flex items-center gap-1.5 text-sm text-error" role="alert">
				<IconAlert class="size-4 shrink-0" />{form.error}
			</p>
		{/if}

		<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
			<!-- ── Main: network, sites, dossier, log ─────────────────────── -->
			<div class="min-w-0 space-y-6">
				<!-- Our network -->
				<section aria-labelledby="network-title">
					<div class="mb-2 flex items-center gap-2">
						<h2 id="network-title" class="section-title flex-1">
							<IconNetwork class="size-4" /> Network in {targetName}
						</h2>
						<Button
							variant="ghost"
							size="xs"
							href="/ops?target={data.selectedTargetId}"
							disabled={footholds === 0}
							icon={IconTarget}
						>
							Plan an operation
						</Button>
					</div>
					{#if data.assets.length}
						<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{#each data.assets as asset (asset.id)}
								{@const selected = selectedAsset?.id === asset.id}
								{@const KindIcon = ASSET_ICON[asset.kind as AssetKind] ?? IconAgent}
								<li
									class="flex flex-col rounded-sm border bg-surface-2 transition-colors {selected
										? 'border-primary bg-primary/10'
										: 'border-line/15'} {asset.usable ? '' : 'opacity-60'}"
								>
									<button
										type="button"
										onclick={() => (selectedAssetId = asset.id)}
										disabled={!asset.usable}
										aria-pressed={selected}
										class="flex w-full items-center gap-3 p-3 text-left"
									>
										<OddsRing value={asset.heat / 100} color={heatColor(asset.heat)} size={52} label="Heat">
											<SpyPortrait seed={asset.portrait} alive={asset.status === "active"} size={38} />
										</OddsRing>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-sm font-medium text-fg">“{asset.codename}”</span>
											<span class="block truncate text-[11px] text-fg-muted">{asset.name}</span>
											<span class="mt-1 flex items-center gap-1.5 text-[11px] text-fg-soft">
												<KindIcon class="size-3.5" />
												{INFILTRATION_ASSETS[asset.kind as AssetKind]?.label ?? "Asset"}
											</span>
										</span>
										<span class="flex shrink-0 flex-col items-end gap-1">
											{#if asset.compromised}
												<Badge size="xs" tone="red">Double</Badge>
											{:else if asset.status === "burned"}
												{@const left = asset.goneAt ? countdown(asset.goneAt, clock) : null}
												<Badge size="xs" tone="red">Burned</Badge>
												{#if left}
													<span
														class="data text-[10px] text-fg-faint"
														title="Burned assets leave the network {INFILTRATION.BURNED_VISIBLE_HOURS}h after burning."
													>
														gone in {left}
													</span>
												{/if}
											{:else}
												<span class="flex gap-0.5" title="Access level {asset.access}">
													{#each [1, 2, 3] as l (l)}
														<span class="h-3 w-1.5 rounded-[1px] {l <= asset.access ? 'bg-primary' : 'bg-surface-8'}"
														></span>
													{/each}
												</span>
											{/if}
											<span class="data text-[10px] {heatText(asset.heat)}">{asset.heat}°</span>
										</span>
									</button>
									{#if asset.traitIds.length}
										<span class="flex flex-wrap gap-1 px-3 pb-2">
											{#each asset.traitIds as traitId (traitId)}
												{@const trait = SPY_TRAITS[traitId as keyof typeof SPY_TRAITS]}
												{#if trait?.rare}
													<span title={trait.description} class="cursor-help">
														<Badge
															size="xs"
															tone="amber"
															icon={IconStar}
															class="shadow-[0_0_6px_rgb(216_178_76/0.45)] ring-1 ring-[#d8b24c]/70"
														>
															{trait.label}
														</Badge>
													</span>
												{:else if trait}
													<Badge size="xs" tone="cyan" class="cursor-help">
														<span title={trait.description}>{trait.label}</span>
													</Badge>
												{/if}
											{/each}
										</span>
									{/if}
									{#if asset.usable}
										<form
											method="POST"
											action="?/act"
											class="mt-auto flex items-center justify-between gap-2 border-t border-line/10 px-3 py-1.5"
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
												<IconCover class="size-3.5" /> Cover
											</button>
										</form>
										{#if lastAction && lastAction.siteId === "" && lastAction.codename === asset.codename}
											<div class="px-3 pb-3">{@render actionResult(lastAction)}</div>
										{/if}
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<div class="panel">
							{@render emptyState(IconAgent, "No assets here yet. Plant one for a first foothold.")}
						</div>
					{/if}
				</section>

				<!-- Sites -->
				<section aria-labelledby="sites-title">
					<h2 id="sites-title" class="section-title mb-2">
						<IconTarget class="size-4" /> Sites in {targetName}
						{#if selectedAsset}
							<span class="ml-auto tracking-normal normal-case">
								Operator <span class="text-fg-soft">“{selectedAsset.codename}”</span>
							</span>
						{/if}
					</h2>
					{#if data.sites.length}
						<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{#each data.sites as site (site.id)}
								{@const Icon = SITE_ICON[site.kind as SiteKind] ?? IconShield}
								{@const open = openSiteId === site.id}
								<li class="min-w-0">
									<button
										type="button"
										onclick={() => {
											openSiteId = open ? null : site.id;
											if (!open)
												setTimeout(
													() =>
														document
															.getElementById("site-workspace")
															?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
													180
												);
										}}
										aria-expanded={open}
										aria-controls="site-workspace"
										class="flex h-full w-full flex-col gap-2 rounded-sm border p-3 text-left transition-colors {open
											? 'border-primary bg-primary/10'
											: 'border-line/15 bg-surface-2 hover:border-line/40 hover:bg-surface-4'}"
									>
										<span class="flex items-start justify-between gap-2">
											<span
												class="grid size-9 shrink-0 place-items-center rounded-sm {open
													? 'bg-primary text-primary-content'
													: 'bg-surface-7 text-fg-soft'}"
											>
												<Icon class="size-5" />
											</span>
											{#if site.known}
												<span class="data text-[11px] text-positive-fg" title="Security level">
													SEC {site.security}
												</span>
											{:else}
												<span class="text-[11px] text-fg-faint">unprobed</span>
											{/if}
										</span>
										<span class="min-w-0">
											<span class="block truncate text-sm font-medium text-fg">{site.name}</span>
											<span class="block truncate text-[11px] text-fg-muted">
												{SITE_TYPES[site.kind as SiteKind]?.label ?? "Site"} · {site.region}
											</span>
										</span>
										<span class="data mt-auto flex items-center gap-2.5 text-[11px] text-fg-muted">
											<span class="flex items-center gap-0.5" title="Access needed">
												<IconKey class="size-3" />L{site.accessRequired}
											</span>
											{#if site.files > 0}
												<span class="flex items-center gap-0.5 text-warning">
													<IconLock class="size-3" />{site.files}
												</span>
											{/if}
											{#if site.cameras > 0}
												<span class="flex items-center gap-0.5 text-primary-fg">
													<IconCam class="size-3" />{site.cameras}
												</span>
											{/if}
										</span>
									</button>
								</li>
							{/each}
						</ul>

						<!-- Site workspace -->
						{#if chosenSite}
							{@const site = chosenSite}
							{@const Icon = SITE_ICON[site.kind as SiteKind] ?? IconShield}
							<div id="site-workspace" class="panel mt-3 overflow-hidden" transition:slide={{ duration: 160 }}>
								<div
									class="flex items-start gap-3 border-b border-line/15 bg-linear-to-br from-primary/15 to-transparent p-4"
								>
									<span class="grid size-12 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary-fg">
										<Icon class="size-6" />
									</span>
									<div class="min-w-0 flex-1">
										<p class="section-title">
											{SITE_TYPES[site.kind as SiteKind]?.label ?? "Site"} · {site.region}
											<span class="data tracking-normal text-fg-faint">{site.code}</span>
										</p>
										<h3 class="text-lg leading-tight font-semibold text-fg">{site.name}</h3>
										<p class="mt-1 text-xs text-fg-muted">{site.blurb}</p>
									</div>
									<button
										type="button"
										class="rounded-sm p-1 text-fg-muted hover:bg-surface-5 hover:text-fg"
										onclick={() => (openSiteId = null)}
										aria-label="Close site"
									>
										<IconClose class="size-4" />
									</button>
								</div>

								<div class="space-y-4 p-4">
									<dl class="grid grid-cols-3 gap-2 text-center">
										<div class="rounded-sm bg-surface-3 px-2 py-2">
											<dt class="section-title justify-center">Security</dt>
											<dd class="data mt-0.5 text-sm text-fg">{site.known ? `L${site.security}` : "?"}</dd>
										</div>
										<div class="rounded-sm bg-surface-3 px-2 py-2">
											<dt class="section-title justify-center">Access</dt>
											<dd class="data mt-0.5 text-sm text-fg">L{site.accessRequired}</dd>
										</div>
										<div class="rounded-sm bg-surface-3 px-2 py-2">
											<dt class="section-title justify-center">Seen</dt>
											<dd class="data mt-0.5 truncate text-sm text-fg">
												{site.lastSeen ? dtg(site.lastSeen) : "Never"}
											</dd>
										</div>
									</dl>

									<!-- Quick actions -->
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
										{#each ["probe", "camera", "files"] as const as kind (kind)}
											{@const spec = INFILTRATION_ACTIONS[kind]}
											{@const blocked = blockedFor(kind, site)}
											{@const chance = oddsFor(kind, site)}
											{@const ActIcon = kind === "probe" ? IconFingerprint : kind === "camera" ? IconCam : IconLock}
											<form
												method="POST"
												action="?/act"
												use:enhance={actForm(kind, site.id)}
												class="flex flex-col gap-2 rounded-sm border border-line/15 bg-surface-2 p-3"
											>
												<input type="hidden" name="assetId" value={selectedAsset?.id ?? ""} />
												<input type="hidden" name="siteId" value={site.id} />
												<input type="hidden" name="action" value={kind} />
												<span class="flex items-center gap-2.5">
													<OddsRing
														value={(chance ?? 0) / 100}
														dim={chance === null}
														size={36}
														textClass="text-[10px]"
														label="{spec.label} chance"
													>
														{#if chance === null}<ActIcon class="size-4 text-fg-muted" />{:else}{chance}<span
																class="text-[0.7em] text-fg-muted"
															>
																%
															</span>{/if}
													</OddsRing>
													<span class="min-w-0">
														<span class="block text-sm font-medium text-fg" title={spec.blurb}>{spec.label}</span>
														{#if blocked}
															<span class="block text-[11px] text-error">{blocked}</span>
														{:else}
															<ResourceRequirements
																inline
																costs={{ currency: spec.cost, heat: spec.heat }}
																{available}
															/>
														{/if}
													</span>
												</span>
												<Button
													type="submit"
													size="xs"
													variant={kind === "files" ? "primary" : "secondary"}
													block
													disabled={!!blocked}
													loading={acting === `${kind}-${site.id}`}
												>
													Run
												</Button>
											</form>
										{/each}
									</div>

									{#if lastAction && lastAction.siteId === site.id}
										{@render actionResult(lastAction)}
									{/if}

									<div>
										<h4 class="section-title mb-2">Cameras · {site.code}</h4>
										<CameraWall {site} systems={siteSession?.systems} />
									</div>

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
										<div
											class="flex items-start gap-2.5 rounded-sm border-l-2 px-3 py-2 text-sm {lastPayload.succeeded
												? 'border-positive bg-positive/5'
												: 'border-hostile bg-hostile/5'}"
											bind:this={resultEl}
											in:fade={{ duration: 150 }}
										>
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

									{#if siteSession?.systems?.mapped && siteSession.systems.files !== "open" && selectedAsset}
										<div>
											<h4 class="section-title mb-2">File share · {site.code}</h4>
											<p class="text-sm text-fg-muted">
												{siteSession.systems.files === "none"
													? "This network keeps no file share worth reading."
													: "The files sit on the file share. Hop to it from the terminal (hop files) to browse them."}
											</p>
										</div>
									{/if}

									{#if siteSession?.systems?.files === "open" && selectedAsset}
										<div>
											<h4 class="section-title mb-2">File share · {site.code}</h4>
											{#if siteSession.systems.dataSets.length}
												<p class="mb-2 text-xs text-fg-muted">
													On the share: {siteSession.systems.dataSets.join(", ")}.
												</p>
											{/if}
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
							</div>
						{/if}
					{:else}
						<div class="panel">{@render emptyState(IconTarget, `No known sites in ${targetName}.`)}</div>
					{/if}
				</section>

				<!-- Dossier -->
				<section aria-labelledby="dossier-title">
					<h2 id="dossier-title" class="section-title mb-2">
						<IconLock class="size-4" /> Dossier
						{#if data.files.length}<span class="data ml-auto tracking-normal">{data.files.length}</span>{/if}
					</h2>
					{#if data.files.length}
						<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							{#each data.files as file (file.id)}
								{@const open = openFileId === file.id}
								<li
									class="min-w-0 rounded-sm border border-l-2 border-line/15 bg-surface-2 {CLASS_TONE[
										file.classification
									] ?? 'border-l-warning'} {open ? 'sm:col-span-2' : ''}"
								>
									<button
										type="button"
										onclick={() => (openFileId = open ? null : file.id)}
										aria-expanded={open}
										class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-4"
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
									{#if open}
										<div class="border-t border-line/10 px-3 py-3" transition:slide={{ duration: 140 }}>
											<p class="mb-2 font-mono text-[10px] tracking-[0.18em] text-hostile-fg uppercase">
												{file.classification} // copied via network asset
											</p>
											<div class="text-sm leading-relaxed whitespace-pre-line text-fg-soft">{file.body}</div>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<div class="panel">
							{@render emptyState(IconLock, "Nothing copied yet. Open a site and pull its files.")}
						</div>
					{/if}
				</section>

				<!-- Activity log -->
				<section class="panel p-4" aria-labelledby="log-title">
					<h2 id="log-title" class="section-title mb-3"><IconHistory class="size-4" /> Activity log</h2>
					{#if data.actions.length}
						<ol>
							{#each data.actions as entry, i (entry.action.id)}
								<li class="relative flex gap-3 pb-3 last:pb-0" out:vanish>
									{#if i < data.actions.length - 1}
										<span class="absolute top-7 bottom-0 left-[13px] w-px bg-line/20" aria-hidden="true"></span>
									{/if}
									<span
										class="relative mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border {entry.action
											.success
											? 'border-positive/50 bg-positive/15 text-positive-fg'
											: 'border-line/30 bg-surface-4 text-fg-muted'}"
									>
										{#if entry.action.action === "cover"}<IconCover class="size-3.5" />
										{:else if entry.action.action === "camera"}<IconCam class="size-3.5" />
										{:else if entry.action.action === "files"}<IconLock class="size-3.5" />
										{:else}<IconFingerprint class="size-3.5" />{/if}
									</span>
									<div class="min-w-0 flex-1">
										<p class="flex flex-wrap items-center gap-x-2 text-sm">
											<span class="font-medium text-fg">
												{INFILTRATION_ACTIONS[entry.action.action as InfiltrationActionKind]?.label ??
													entry.action.action}
											</span>
											<span class="text-xs text-fg-muted">“{entry.codename}”</span>
											<span class="data ml-auto text-[11px] {heatText(entry.action.heatAfter)}">
												{entry.action.heatAfter}°
											</span>
										</p>
										<p class="text-xs text-fg-soft">{entry.action.detail}</p>
										<p class="data text-[11px] text-fg-faint">{dtg(entry.action.createdAt)}</p>
									</div>
								</li>
							{/each}
						</ol>
					{:else}
						{@render emptyState(IconHistory, "No network activity yet. Probe a site to start.")}
					{/if}
				</section>
			</div>

			<!-- ── Side rail: planting, enemy assets ─────────────────────── -->
			<div class="min-w-0 space-y-6 self-start lg:sticky lg:top-4">
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
					<fieldset class="grid min-w-0 grid-cols-3 gap-1.5 px-4">
						<legend class="sr-only">Asset type</legend>
						{#each ASSET_KINDS as kind (kind)}
							{@const spec = INFILTRATION_ASSETS[kind]}
							{@const Icon = ASSET_ICON[kind]}
							<label
								title={spec.blurb}
								class="group flex cursor-pointer flex-col items-center gap-1 rounded-sm border border-line/15 bg-surface-2 px-1 py-2.5 text-center transition-colors hover:border-line/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60"
								class:opacity-60={treasury < spec.cost}
							>
								<input type="radio" name="kind" value={kind} bind:group={plantKind} class="sr-only" />
								<Icon class="size-5 text-fg-muted group-has-[:checked]:text-primary-fg" />
								<span class="text-xs leading-tight font-medium text-fg">{spec.label}</span>
								<span class="data text-[10px] text-fg-muted">{money(spec.cost)} · L{spec.access}</span>
							</label>
						{/each}
					</fieldset>
					<div class="space-y-3 p-4">
						<p class="text-xs text-fg-muted">{INFILTRATION_ASSETS[plantKind].blurb}</p>
						<ResourceRequirements inline costs={plantCosts} {available} />
						<Button
							type="submit"
							variant="primary"
							block
							loading={planting}
							loadingText="Planting…"
							disabled={atCapacity || !!plantWait || treasury < INFILTRATION_ASSETS[plantKind].cost}
							title={plantWait
								? `Recruiting in one state has a ${INFILTRATION.PLANT_COOLDOWN_HOURS}h cooldown.`
								: undefined}
						>
							{atCapacity
								? `Network full (${INFILTRATION.MAX_ASSETS_PER_TARGET} assets)`
								: plantWait
									? `Recruiters lying low · ${plantWait}`
									: `Plant ${INFILTRATION_ASSETS[plantKind].label.toLowerCase()}`}
						</Button>
						<p class="text-[11px] text-fg-faint">
							One recruitment per {INFILTRATION.PLANT_COOLDOWN_HOURS}h in each state.
						</p>
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
						<ul class="space-y-2">
							{#each data.enemyAssets as enemy (enemy.id)}
								<li class="flex items-center gap-3 rounded-sm bg-surface-3 p-2">
									<OddsRing value={enemy.heat / 100} color={heatColor(enemy.heat)} size={42} label="Heat">
										<SpyPortrait seed={enemy.portrait} alive={!enemy.doubleAgent} size={30} />
									</OddsRing>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-fg">“{enemy.codename}”</p>
										<p class="truncate text-[11px] text-fg-muted">
											{INFILTRATION_ASSETS[enemy.kind as AssetKind]?.label ?? "Asset"} · {enemy.owner}
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
												Turn · <span class="data">{money(INFILTRATION.FLIP_COST)}</span>
											</Button>
										</form>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						{@render emptyState(IconShield, "No hostile assets known to be operating here.")}
					{/if}
				</section>
			</div>
		</div>
	{/if}
</PageContainer>
