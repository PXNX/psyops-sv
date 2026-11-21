<!-- src/routes/(authenticated)/(dock)/ops/network/+page.svelte -->
<!-- Network operations: the hands-on layer under cyber ops and psyops. Plant
     assets in a target, probe its sites, watch their security cameras, copy
     sensitive files, cover tracks before the heat burns the asset. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { fade } from "svelte/transition";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, SearchSelect } from "#lib/component/ui/index.js";
	import CameraFeed from "#lib/component/infiltration/CameraFeed.svelte";
	import IntrusionConsole from "#lib/component/infiltration/IntrusionConsole.svelte";
	import {
		ASSET_KINDS,
		COVERT_OPS,
		INFILTRATION,
		INFILTRATION_ACTIONS,
		INFILTRATION_ASSETS,
		INTRUSION,
		NETWORK_ASSET_BONUS,
		SITE_TYPES,
		actionChance,
		networkFootholdCap,
		type AssetKind,
		type InfiltrationActionKind,
		type SiteKind
	} from "#lib/config/index.js";
	import { dtg } from "#lib/utils/military.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { vanish } from "#lib/utils/motion.js";
	import IconBack from "~icons/fluent/arrow-left-20-filled";
	import IconRadar from "~icons/mdi/radar";
	import IconLock from "~icons/mdi/file-lock";
	import IconCam from "~icons/mdi/cctv";
	import IconFactory from "~icons/mdi/factory";
	import IconPlane from "~icons/mdi/airplane";
	import IconServer from "~icons/mdi/server";
	import IconNetwork from "~icons/mdi/network";
	import IconPulse from "~icons/mdi/pulse";
	import IconShield from "~icons/mdi/shield-half-full";
	import IconAgent from "~icons/mdi/account-tie";
	import IconBug from "~icons/mdi/bug";
	import IconKey from "~icons/mdi/key";
	import IconFingerprint from "~icons/mdi/fingerprint";
	import IconCover from "~icons/mdi/incognito";
	import IconClock from "~icons/mdi/clock-alert";

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
	let openSiteId = $state<string | null>(null);
	let openFileId = $state<number | null>(null);
	let lastAction = $state<Outcome | null>(null);
	let lastPayload = $state<any>(null);
	let planting = $state(false);
	let acting = $state<string | null>(null);
	let terminalEl: HTMLElement | undefined = $state();

	const targetItems = $derived(
		data.targets.map((t: { id: number; name: string; logo: string | null }) => ({
			id: t.id,
			name: t.name,
			logo: t.logo
		}))
	);
	const activeAssets = $derived(data.assets.filter((a: any) => a.usable));
	const selectedAsset = $derived(
		data.assets.find((a: any) => a.id === selectedAssetId && a.usable) ?? activeAssets[0] ?? null
	);
	const footholds = $derived(Math.min(networkFootholdCap, activeAssets.length));
	const chosenSite = $derived(data.sites.find((s: any) => s.id === openSiteId) ?? null);
	const siteSession = $derived(
		chosenSite && selectedAsset
			? (data.sessions.find((s: any) => s.assetId === selectedAsset.id && s.siteId === chosenSite.id) ?? null)
			: null
	);
	const chosenFile = $derived(data.files.find((f: any) => f.id === openFileId) ?? null);
	const atCapacity = $derived(activeAssets.length >= INFILTRATION.MAX_ASSETS_PER_TARGET);

	const SITE_ICON: Record<SiteKind, typeof IconFactory> = {
		powerplant: IconFactory,
		airbase: IconPlane,
		datacenter: IconServer,
		telecom: IconNetwork,
		lab: IconPulse,
		command: IconShield
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
		if ((data.treasury ?? 0) < cost) return `Needs $${cost.toLocaleString()}.`;
		return null;
	}
	const pct = (n: number) => `${n}%`;
	function focusTerminal() {
		queueMicrotask(() => terminalEl?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
	}

	const plantForm = () => {
		planting = true;
		return async ({ result, update }: any) => {
			planting = false;
			await update({ reset: false });
			toastResult(result);
			if (result.type === "success" && result.data?.planted) {
				const planted = result.data.planted;
				selectedAssetId = planted.assetId ?? selectedAssetId;
			}
		};
	};
	const actForm = (kind: InfiltrationActionKind, siteId: string) => {
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
				focusTerminal();
			}
		};
	};
</script>

<svelte:head>
	<title>Network operations · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="6xl">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<a href="/ops" class="mb-2 inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-primary">
				<IconBack class="size-3.5" /> Covert operations
			</a>
			<p class="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">J3 · Access & influence</p>
			<h1 class="text-2xl font-bold text-fg">Network operations</h1>
			{#if data.state}
				<p class="text-sm text-fg-muted">
					{data.state.name}{data.authority ? ` · ${data.authority.roleLabel}` : ""}
				</p>
			{/if}
		</div>
		{#if data.treasury !== null}
			<dl class="flex gap-5 text-right">
				<div>
					<dt class="section-title justify-end">Treasury</dt>
					<dd class="data text-lg text-fg">${data.treasury.toLocaleString()}</dd>
				</div>
				<div>
					<dt class="section-title justify-end">Footholds</dt>
					<dd class="data text-lg text-fg">{footholds}/{networkFootholdCap}</dd>
				</div>
			</dl>
		{/if}
	</header>

	{#if !data.authority}
		<div class="panel mt-6 p-6 text-sm text-fg-muted">
			Networks are run by your state's president, defence minister or foreign minister. You can still see what your
			state knows about the operations against it on the <a class="text-primary hover:underline" href="/ops">
				operations console
			</a>.
		</div>
	{:else if !data.targets.length}
		<div class="panel mt-6 p-6 text-sm text-fg-muted">
			There is no state to build a network in yet. Your own state and bloc partners are off limits.
		</div>
	{:else}
		<!-- Target selector: state logo shown in the dropdown -->
		<form method="GET" class="panel mt-6 flex flex-wrap items-end gap-4 p-4">
			<div class="min-w-56 flex-1">
				<label class="field-label" for="net-target">Target state</label>
				<SearchSelect
					id="net-target"
					name="target"
					items={targetItems}
					value={data.selectedTargetId ? String(data.selectedTargetId) : undefined}
					placeholder="Choose a target…"
					searchPlaceholder="Search states…"
				/>
			</div>
			<Button type="submit" variant="secondary" icon={IconRadar}>Open dossier</Button>
		</form>

		<div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
			<!-- ── Network ─────────────────────────────────────────────────── -->
			<section class="space-y-4" aria-labelledby="network-title">
				<div class="flex items-center justify-between">
					<h2 id="network-title" class="section-title">
						Your network in {data.targets.find((t: any) => t.id === data.selectedTargetId)?.name}
					</h2>
					<span class="data text-xs text-fg-muted">
						{activeAssets.length}/{INFILTRATION.MAX_ASSETS_PER_TARGET} active
					</span>
				</div>

				{#if data.assets.length}
					<ul class="space-y-2">
						{#each data.assets as asset (asset.id)}
							{@const Icon = ASSET_ICON[asset.kind as AssetKind] ?? IconAgent}
							<li>
								<button
									type="button"
									onclick={() => (selectedAssetId = asset.id)}
									disabled={!asset.usable}
									class="panel-interactive w-full rounded-sm p-3 text-left disabled:opacity-50 {selectedAsset?.id ===
									asset.id
										? 'border-primary/70'
										: ''}"
								>
									<div class="flex items-start gap-3">
										<div class="rounded-sm bg-surface-4 p-2 text-primary"><Icon class="size-4" /></div>
										<div class="min-w-0 flex-1">
											<div class="flex items-center justify-between gap-2">
												<p class="truncate font-semibold text-fg">{asset.codename}</p>
												{#if asset.status === "burned"}
													<Badge size="xs" tone="red">burned</Badge>
												{:else}
													<Badge size="xs" tone="blue">L{asset.access}</Badge>
												{/if}
											</div>
											<p class="text-xs text-fg-muted">
												{INFILTRATION_ASSETS[asset.kind as AssetKind]?.label ?? asset.kind} · {asset.handler ??
													"unknown handler"}
											</p>
											<div class="mt-2 flex items-center gap-2">
												<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-6">
													<div
														class="h-full {heatTone(asset.heat)} transition-[width]"
														style:width={pct(asset.heat)}
													></div>
												</div>
												<span class="data text-[11px] {heatText(asset.heat)}">HEAT {asset.heat}</span>
											</div>
										</div>
									</div>
								</button>
								{#if asset.usable}
									<form method="POST" action="?/act" class="mt-1 flex justify-end" use:enhance={actForm("cover", "")}>
										<input type="hidden" name="assetId" value={asset.id} />
										<input type="hidden" name="action" value="cover" />
										<button
											type="submit"
											disabled={(data.treasury ?? 0) < INFILTRATION_ACTIONS.cover.cost || acting === `cover-`}
											class="inline-flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-primary disabled:opacity-40"
										>
											<IconCover class="size-3.5" /> Cover tracks · ${INFILTRATION_ACTIONS.cover.cost.toLocaleString()}
										</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="panel p-4 text-sm text-fg-muted">
						No assets in this state yet. Plant one below to get a first foothold.
					</p>
				{/if}

				<!-- Plant a new asset -->
				<form method="POST" action="?/plant" class="panel space-y-3 p-4" use:enhance={plantForm}>
					<input type="hidden" name="targetStateId" value={data.selectedTargetId} />
					<h3 class="section-title">Plant an asset</h3>
					<fieldset class="space-y-2">
						<legend class="sr-only">Asset type</legend>
						{#each ASSET_KINDS as kind (kind)}
							{@const spec = INFILTRATION_ASSETS[kind]}
							{@const Icon = ASSET_ICON[kind]}
							<label
								class="panel-interactive flex cursor-pointer items-start gap-3 p-3 has-[:checked]:border-primary/70 has-[:checked]:bg-surface-6"
							>
								<input type="radio" name="kind" value={kind} bind:group={plantKind} class="sr-only" />
								<Icon class="mt-0.5 size-4 shrink-0 text-primary" />
								<span class="min-w-0 flex-1">
									<span class="flex items-center justify-between gap-2">
										<span class="font-semibold text-fg">{spec.label}</span>
										<span class="data text-xs text-fg-soft">${spec.cost.toLocaleString()} · L{spec.access}</span>
									</span>
									<span class="mt-0.5 block text-xs text-fg-muted">{spec.blurb}</span>
								</span>
							</label>
						{/each}
					</fieldset>
					<Button
						type="submit"
						variant="primary"
						block
						loading={planting}
						loadingText="Planting…"
						disabled={atCapacity || (data.treasury ?? 0) < INFILTRATION_ASSETS[plantKind].cost}
					>
						{atCapacity
							? `Network full (${INFILTRATION.MAX_ASSETS_PER_TARGET} assets)`
							: `Plant ${INFILTRATION_ASSETS[plantKind].label.toLowerCase()}`}
					</Button>
					<p class="field-hint">
						Live footholds add up to +{Math.round(NETWORK_ASSET_BONUS.SUCCESS_PER_ASSET * 100)}% success and −{Math.round(
							NETWORK_ASSET_BONUS.ATTRIBUTION_PER_ASSET * 100
						)}% attribution per asset (max
						{NETWORK_ASSET_BONUS.CAP}) to your cyber operations and psyops.
					</p>
					<Button variant="ghost" size="sm" block href="/ops?target={data.selectedTargetId}" disabled={footholds === 0}>
						Plan an operation with these footholds →
					</Button>
				</form>
			</section>

			<!-- ── Target sites & dossier ─────────────────────────────────── -->
			<section class="space-y-4" aria-labelledby="sites-title">
				<h2 id="sites-title" class="section-title">Target sites</h2>
				<ul class="space-y-2">
					{#each data.sites as site (site.id)}
						{@const Icon = SITE_ICON[site.kind as SiteKind] ?? IconShield}
						<li>
							<button
								type="button"
								onclick={() => (openSiteId = openSiteId === site.id ? null : site.id)}
								class="panel-interactive w-full rounded-sm p-3 text-left {openSiteId === site.id
									? 'border-primary/70'
									: ''}"
							>
								<div class="flex items-center gap-3">
									<div class="rounded-sm bg-surface-4 p-2 text-primary"><Icon class="size-4" /></div>
									<div class="min-w-0 flex-1">
										<p class="truncate font-semibold text-fg">{site.name}</p>
										<p class="data text-[11px] text-fg-muted">
											{site.code} · {SITE_TYPES[site.kind as SiteKind]?.label ?? site.kind} · {site.region}
										</p>
									</div>
									<div class="flex shrink-0 items-center gap-1.5">
										{#if site.files > 0}<Badge size="xs" tone="amber">
												<IconLock class="mr-0.5 inline size-3" />{site.files}
											</Badge>{/if}
										{#if site.cameras > 0}<Badge size="xs" tone="blue">
												<IconCam class="mr-0.5 inline size-3" />{site.cameras}
											</Badge>{/if}
										{#if site.known}
											<Badge size="xs" tone="green">L{site.security}</Badge>
										{:else}
											<Badge size="xs" tone="neutral">unknown</Badge>
										{/if}
									</div>
								</div>
							</button>

							{#if openSiteId === site.id}
								<div class="panel mt-1 space-y-3 rounded-sm p-3" transition:fade={{ duration: 120 }}>
									<p class="text-xs text-fg-muted">{site.blurb}</p>
									<dl class="grid grid-cols-3 gap-2 text-xs">
										<div>
											<dt class="section-title">Security</dt>
											<dd class="data text-fg">{site.known ? `L${site.security}` : "—"}</dd>
										</div>
										<div>
											<dt class="section-title">Access needed</dt>
											<dd class="data text-fg">L{site.accessRequired}</dd>
										</div>
										<div>
											<dt class="section-title">Last seen</dt>
											<dd class="data text-fg">{site.lastSeen ? dtg(site.lastSeen) : "never"}</dd>
										</div>
									</dl>

									{#if site.cameras > 0}
										<CameraFeed {site} observedAt={site.lastSeen ?? undefined} />
									{/if}

									{#if selectedAsset}
										<div>
											<h4 class="section-title mb-2">Operator terminal · {selectedAsset.codename}</h4>
											<IntrusionConsole
												session={siteSession}
												{site}
												asset={selectedAsset}
												treasury={data.treasury ?? 0}
												onResult={(d) => {
													if (d?.payload) {
														lastPayload = d.payload;
														focusTerminal();
													}
												}}
											/>
										</div>
									{/if}

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
													variant={kind === "files" ? "secondary" : "ghost"}
													block
													disabled={!!blocked}
													loading={acting === `${kind}-${site.id}`}
												>
													{spec.label}{#if chance !== null}<span class="data ml-1 opacity-70">≈{chance}%</span>{/if}
												</Button>
												<p class="field-hint mt-1 text-center text-[10px]">
													{blocked ?? `$${spec.cost.toLocaleString()} · +${spec.heat} heat`}
												</p>
											</form>
										{/each}
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>

				<!-- Dossier: sensitive files -->
				<h2 class="section-title pt-2">Dossier <span class="text-fg-muted">({data.files.length} files)</span></h2>
				{#if data.files.length}
					<div class="panel divide-y divide-line/10 overflow-hidden rounded-sm">
						{#each data.files as file (file.id)}
							<button
								type="button"
								onclick={() => (openFileId = openFileId === file.id ? null : file.id)}
								class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-4/60"
							>
								<span class="min-w-0">
									<span class="block truncate text-sm font-medium text-fg">{file.title}</span>
									<span class="data block text-[11px] text-fg-muted">{file.siteId} · {dtg(file.capturedAt)}</span>
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
								<div class="bg-surface-1/60 px-4 py-3" transition:fade={{ duration: 120 }}>
									<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-hostile-fg">
										{file.classification} // copied via network asset
									</p>
									<div class="whitespace-pre-line font-serif text-sm leading-relaxed text-fg-soft">{file.body}</div>
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="panel p-4 text-sm text-fg-muted">Nothing copied yet. Pull files from a site to fill the dossier.</p>
				{/if}

				<!-- Payload result -->
				{#if lastPayload}
					<div class="panel p-4" in:fade={{ duration: 150 }}>
						<div class="flex items-center justify-between gap-2">
							<h3 class="section-title">Payload · {lastPayload.kind.replace(/_/g, " ")}</h3>
							<Badge size="xs" tone={lastPayload.succeeded ? "green" : "red"}>
								{lastPayload.succeeded ? "deployed" : "blocked"}
							</Badge>
						</div>
						<p class="mt-2 text-sm text-fg-body">
							{COVERT_OPS[lastPayload.kind as keyof typeof COVERT_OPS]?.label ?? lastPayload.kind}
							against {lastPayload.target}: success {lastPayload.successChance}% · attribution {lastPayload.attributionChance}%.
							{#if lastPayload.stolen}${lastPayload.stolen.kept.toLocaleString()} reached our treasury.{/if}
						</p>
					</div>
				{/if}

				<!-- Last action -->
				{#if lastAction}
					<div bind:this={terminalEl} class="panel p-4" transition:fade={{ duration: 150 }}>
						<div class="flex items-center justify-between gap-2">
							<h3 class="section-title">Last action · {lastAction.codename}</h3>
							<Badge size="xs" tone={lastAction.success ? "green" : "red"}>
								{lastAction.success ? "success" : "failed"}
							</Badge>
						</div>
						<p class="mt-2 text-sm text-fg-body">{lastAction.detail}</p>
						<p class="data mt-1 text-[11px] text-fg-muted">
							chance {lastAction.chance}% · heat now {lastAction.heatAfter}{lastAction.burned ? " · ASSET BURNED" : ""}
						</p>
					</div>
				{/if}
			</section>
		</div>

		<!-- Activity log -->
		<section class="mt-8" aria-labelledby="log-title">
			<h2 id="log-title" class="section-title mb-2">Activity log</h2>
			{#if data.actions.length}
				<div class="panel overflow-hidden rounded-sm">
					<ul class="divide-y divide-line/10">
						{#each data.actions as entry (entry.action.id)}
							<li out:vanish class="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
								<span class="data w-36 shrink-0 text-xs text-fg-muted">{dtg(entry.action.createdAt)}</span>
								<span class="w-28 shrink-0 font-medium text-fg">{entry.codename}</span>
								<Badge size="xs" tone={entry.action.success ? "green" : "neutral"}>{entry.action.action}</Badge>
								<span class="min-w-0 flex-1 text-fg-soft">{entry.action.detail}</span>
								<span class="data text-xs {heatText(entry.action.heatAfter)}">H{entry.action.heatAfter}</span>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="panel p-4 text-sm text-fg-muted">No network activity on record.</p>
			{/if}
		</section>

		{#if form?.error}
			<div class="panel mt-4 border-red-500/30 p-4 text-sm text-hostile-fg">{form.error}</div>
		{/if}
	{/if}
</PageContainer>
