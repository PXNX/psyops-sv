<!-- src/routes/company/[id]/+page.svelte -->
<!-- A company as its commercial register extract: the registry entry, the
     balance sheet, the share capital (certificates, register, order book)
     and the works it operates. -->
<script lang="ts">
	import { tick } from "svelte";
	import { enhance } from "$app/forms";
	import { vanish } from "#lib/utils/motion.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { getRegionName, formatDate, regionCoatUrl } from "#lib/utils/formatting.js";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentHome20Filled from "~icons/fluent/home-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentArrowDownload20Filled from "~icons/fluent/arrow-download-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentLockClosed20Filled from "~icons/fluent/lock-closed-20-filled";

	import PageContainer from "#lib/component/PageContainer.svelte";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Button, IconButton, Badge } from "#lib/component/ui/index.js";
	import EditCompanySheet from "./EditCompanySheet.svelte";
	import DividendsPanel from "./DividendsPanel.svelte";

	let { data } = $props();

	let showEditCompanySheet = $state(false);

	let depositAmount = $state(10000);
	let isDepositing = $state(false);
	let fundShifts = $state(1);
	let isFunding = $state(false);
	let isSettingHq = $state(false);

	let ipoPrice = $state(1000);
	let isGoingPublic = $state(false);

	let listQuantity = $state(1);
	let listPrice = $state(data.shares?.ipoPrice ?? 100);
	let isListing = $state(false);

	let buyQuantities = $state<Record<number, number>>({});
	let isBuying = $state<Record<number, boolean>>({});

	let balanceEl = $state<HTMLElement | null>(null);
	let capitalEl = $state<HTMLElement | null>(null);
	let certificateEl = $state<HTMLElement | null>(null);

	const maxRate = $derived(Math.max(1, ...data.resourceProduction.map((r) => r.productionRate)));
	const myPercent = $derived(data.shares ? Math.round((data.myHolding / data.shares.totalShares) * 1000) / 10 : 0);
	const today = formatDate(new Date());

	/** Successes celebrate the part of the page that changed; failures toast. */
	function settle(target: () => HTMLElement | null) {
		return async ({ result, update }: { result: { type: string; data?: unknown }; update: () => Promise<void> }) => {
			await update();
			if (result.type === "success") {
				await tick();
				celebrate(target());
			} else {
				toastResult(result);
			}
		};
	}

	const money = (n: number) => n.toLocaleString();
</script>

<svelte:head>
	<title>{`${data.company.name} · PsyOps`}</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Register extract -->
	<header class="panel rounded-sm p-5 sm:p-6 relative">
		{#if data.isOwner}
			<IconButton
				icon={FluentEdit20Filled}
				label="Edit Company"
				variant="secondary"
				size="sm"
				shape="square"
				class="absolute top-3 right-3"
				onclick={() => (showEditCompanySheet = true)}
			/>
		{/if}

		<div class="flex items-start gap-4 pr-12">
			<Logo
				src={data.company.logo}
				alt=""
				placeholderIcon={FluentBuilding20Filled}
				placeholderGradient="from-surface-13 to-surface-6"
				class="size-16 sm:size-20 rounded-sm shrink-0"
			/>
			<div class="min-w-0 flex-1">
				<h1 class="font-serif text-2xl sm:text-4xl font-black text-fg leading-tight break-words">
					{data.company.name}
				</h1>
				<Badge tone={data.shares ? "green" : "amber"} size="xs" class="sm:hidden mt-1 uppercase tracking-widest">
					{data.shares ? "Listed" : "Private"}
				</Badge>
				{#if data.company.description}
					<p class="mt-1.5 font-serif italic text-sm sm:text-base text-fg-soft max-w-2xl">
						{data.company.description}
					</p>
				{/if}
			</div>
			<span
				class="hidden sm:inline-block shrink-0 self-center animate-stamp border-2 rounded-sm px-3 py-1 font-serif text-sm font-black uppercase tracking-widest {data.shares
					? 'border-positive/70 text-positive-fg'
					: 'border-primary/60 text-primary-fg'}"
				style="transform: rotate(-8deg)"
			>
				{data.shares ? "Listed" : "Private"}
			</span>
		</div>

		<dl class="mt-5 grid grid-cols-1 sm:grid-cols-2 border-t border-line/20">
			<div class="py-3 sm:pr-4 border-b border-line/10">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted mb-1.5">Proprietor</dt>
				<dd>
					<UserLink
						id={data.company.ownerId}
						name={data.company.ownerName}
						avatar={data.company.ownerLogo}
						party={{ abbreviation: data.company.ownerPartyAbbreviation, color: data.company.ownerPartyColor }}
						size="md"
					/>
				</dd>
			</div>

			<div class="py-3 sm:pl-4 border-b border-line/10 sm:border-l">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted mb-1.5">Registered office</dt>
				<dd class="space-y-2">
					{#if data.company.stateName}
						<a
							href="/state/{data.company.stateId}"
							class="flex items-center gap-2 text-sm text-fg-body hover:text-primary-hover transition-colors"
						>
							{#if data.company.regionId}
								<img
									src={regionCoatUrl(data.company.regionId)}
									alt=""
									class="size-6 object-contain shrink-0"
									loading="lazy"
									decoding="async"
								/>
							{:else}
								<FluentHome20Filled class="size-5 text-friendly shrink-0" />
							{/if}
							<span class="truncate">
								<span class="font-semibold">{data.company.regionName ?? data.company.stateName}</span>
								{#if data.company.regionName}<span class="text-fg-muted">, {data.company.stateName}</span>{/if}
							</span>
						</a>
					{:else}
						<p class="text-sm text-fg-muted">None on file</p>
					{/if}

					{#if data.isOwner}
						{#if data.residenceRegion && data.residenceRegion.id !== data.company.regionId}
							<form
								method="POST"
								action="?/setHeadquarters"
								use:enhance={() => {
									isSettingHq = true;
									return async ({ update, result }) => {
										await update();
										isSettingHq = false;
										toastResult(result);
									};
								}}
							>
								<Button type="submit" variant="soft-blue" size="xs" icon={FluentHome20Filled} loading={isSettingHq}>
									Move to {data.residenceRegion.name}
								</Button>
							</form>
						{:else if !data.residenceRegion}
							<p class="text-xs text-fg-muted">Needs a residence to register an office.</p>
						{/if}
					{/if}
				</dd>
			</div>

			<div class="py-3 sm:pr-4 border-b sm:border-b-0 border-line/10 grid grid-cols-2 gap-3">
				<div>
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Established</dt>
					<dd class="text-sm font-semibold text-fg">{formatDate(data.company.foundedAt)}</dd>
				</div>
				<div>
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">Workforce</dt>
					<dd class="text-sm font-semibold text-fg">
						{data.totalWorkers} in {data.factories.length}
						{data.factories.length === 1 ? "factory" : "factories"}
					</dd>
				</div>
			</div>

			<div class="py-3 sm:pl-4 sm:border-l border-line/10">
				<dt class="text-[10px] uppercase tracking-wide text-fg-muted mb-1">Operating in</dt>
				<dd class="flex flex-wrap gap-1.5">
					{#each data.uniqueStates as state (state.id)}
						<a href="/state/{state.id}">
							<Badge tone="neutral" size="xs" class="hover:text-primary-hover">{state.name}</Badge>
						</a>
					{:else}
						<span class="text-sm text-fg-muted">—</span>
					{/each}
				</dd>
			</div>
		</dl>
	</header>

	{#if data.embargoReason}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentWarning20Filled class="size-5 text-red-400 shrink-0" />
			<p class="text-sm">{data.embargoReason}</p>
		</div>
	{/if}

	<!-- Balance sheet (owner only) -->
	{#if data.isOwner}
		<section class="panel rounded-sm p-5 sm:p-6" bind:this={balanceEl}>
			<div class="flex items-baseline justify-between gap-3 border-b-2 border-double border-line/40 pb-2">
				<h2 class="font-serif text-xl font-bold text-fg">Balance Sheet</h2>
				<span class="text-xs text-fg-muted">as of {today}</span>
			</div>

			<div class="grid sm:grid-cols-2 sm:gap-8 font-mono text-sm">
				<div>
					<h3 class="mt-3 mb-1 font-sans text-[10px] uppercase tracking-wide text-fg-muted">Paid in</h3>
					<div class="flex justify-between py-1.5 border-b border-dashed border-line/15">
						<span class="font-sans text-fg-soft">Capital deposited</span>
						<span class="text-positive-fg">{money(data.budget.totalDeposited)}</span>
					</div>
					<div class="flex justify-between py-1.5 border-b border-dashed border-line/15">
						<span class="font-sans text-fg-soft">Wages &amp; costs paid</span>
						<span class="text-red-300">−{money(data.budget.totalSpent)}</span>
					</div>
				</div>
				<div>
					<h3 class="mt-3 mb-1 font-sans text-[10px] uppercase tracking-wide text-fg-muted">Running costs</h3>
					<div class="flex justify-between py-1.5 border-b border-dashed border-line/15">
						<span class="font-sans text-fg-soft">Wage bill per shift</span>
						<span class="text-fg-body">{money(data.totalWageCost)}</span>
					</div>
					<div class="flex justify-between py-1.5 border-b border-dashed border-line/15">
						<span class="font-sans text-fg-soft">Shifts covered</span>
						<span class="text-fg-body">{data.totalWageCost > 0 ? data.shiftsAffordable : "—"}</span>
					</div>
				</div>
			</div>

			<div class="mt-3 pt-2 border-t-2 border-double border-line/40 flex items-baseline justify-between gap-3">
				<span class="text-xs uppercase tracking-wide text-fg-muted">Cash at bank</span>
				{#key data.budget.balance}
					<span class="font-mono text-2xl font-bold text-fg animate-tick">{money(data.budget.balance)}</span>
				{/key}
			</div>

			<div class="mt-5 grid sm:grid-cols-2 gap-3">
				<form
					method="POST"
					action="?/depositBudget"
					class="panel-muted rounded-sm p-3 space-y-2"
					use:enhance={() => {
						isDepositing = true;
						const handle = settle(() => balanceEl);
						return async (args) => {
							await handle(args);
							isDepositing = false;
						};
					}}
				>
					<label class="field-label flex justify-between" for="amount">
						<span>Pay in from wallet</span>
						<span class="text-positive-fg flex items-center gap-1"
							><FluentMoney20Filled class="size-3.5" />{money(data.ownerBalance)}</span
						>
					</label>
					<div class="flex gap-2">
						<input
							id="amount"
							type="number"
							name="amount"
							bind:value={depositAmount}
							min="1"
							max={data.ownerBalance}
							class="field-control rounded-sm px-3 py-2 w-full min-w-0 font-mono"
							required
						/>
						<Button
							type="submit"
							variant="soft-emerald"
							icon={FluentArrowDownload20Filled}
							loading={isDepositing}
							disabled={depositAmount > data.ownerBalance || depositAmount < 1}
						>
							Deposit
						</Button>
					</div>
				</form>

				<form
					method="POST"
					action="?/fundWages"
					class="panel-muted rounded-sm p-3 space-y-2"
					use:enhance={() => {
						isFunding = true;
						const handle = settle(() => balanceEl);
						return async (args) => {
							await handle(args);
							isFunding = false;
						};
					}}
				>
					<label class="field-label flex justify-between" for="shifts">
						<span>Pay wages in advance</span>
						<span class="font-mono text-fg-muted">{money(data.totalWageCost * (fundShifts || 0))}</span>
					</label>
					<div class="flex gap-2">
						<input
							id="shifts"
							type="number"
							name="shifts"
							bind:value={fundShifts}
							min="1"
							max={Math.max(1, data.shiftsAffordable)}
							class="field-control rounded-sm px-3 py-2 w-full min-w-0 font-mono"
							required
							disabled={data.totalWageCost === 0}
						/>
						<Button
							type="submit"
							variant="secondary"
							loading={isFunding}
							disabled={data.totalWageCost === 0 || fundShifts < 1 || fundShifts > data.shiftsAffordable}
						>
							Fund shifts
						</Button>
					</div>
					{#if data.totalWageCost === 0}
						<p class="field-hint">No workers on the payroll.</p>
					{/if}
				</form>
			</div>
		</section>
	{/if}

	<!-- Share capital -->
	<section class="panel rounded-sm p-5 sm:p-6 space-y-5" bind:this={capitalEl}>
		<h2 class="section-title">Share Capital</h2>

		{#if !data.shares}
			{#if data.isOwner}
				<div class="border-2 border-dashed border-line/30 rounded-sm p-4 sm:p-5 text-center">
					<p class="font-serif text-lg text-fg-body">
						{data.ipoConfig.totalShares.toLocaleString()} shares, unissued
					</p>
					<p class="mt-1 text-xs text-fg-muted">
						You keep a locked {data.ipoConfig.founderLockedPercent}% block; the rest lists at your price.
					</p>
					<form
						method="POST"
						action="?/goPublic"
						class="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end justify-center"
						use:enhance={() => {
							isGoingPublic = true;
							const handle = settle(() => capitalEl);
							return async (args) => {
								await handle(args);
								isGoingPublic = false;
							};
						}}
					>
						<div class="text-left">
							<label class="field-label" for="startingPrice">Price per share</label>
							<input
								id="startingPrice"
								type="number"
								name="startingPrice"
								bind:value={ipoPrice}
								min={data.ipoConfig.minPrice}
								class="field-control rounded-sm px-3 py-2.5 w-full sm:w-40 font-mono"
								required
							/>
						</div>
						<Button type="submit" variant="primary" loading={isGoingPublic} loadingText="Issuing…">Go public</Button>
					</form>
				</div>
			{:else}
				<p class="text-sm text-fg-muted">Privately held. No shares issued.</p>
			{/if}
		{:else}
			<!-- Your certificate -->
			{#if data.myHolding > 0}
				<div
					bind:this={certificateEl}
					class="relative rounded-sm border-4 border-double border-line/50 bg-primary/5 p-4 sm:p-6 text-center animate-rise-in"
				>
					<div class="absolute inset-1.5 rounded-sm border border-line/15 pointer-events-none"></div>
					<p class="mt-1 font-serif text-xl sm:text-2xl font-black uppercase tracking-widest text-primary-fg">
						Share Certificate
					</p>
					<p class="mt-3 font-serif italic text-sm sm:text-base text-fg-soft">
						This certifies that you are the holder of
					</p>
					{#key data.myHolding}
						<p class="mt-1 font-mono text-3xl font-bold text-fg animate-tick">
							{data.myHolding.toLocaleString()}
						</p>
					{/key}
					<p class="font-serif italic text-sm sm:text-base text-fg-soft">
						shares of <span class="not-italic font-semibold text-fg">{data.company.name}</span>
						· {myPercent}% of the issued capital
					</p>
					<div
						class="mx-auto mt-4 size-12 rounded-full border-2 border-line/50 overflow-hidden animate-stamp"
						style="transform: rotate(-8deg)"
					>
						<Logo
							src={data.company.logo}
							alt=""
							placeholderIcon={FluentBuilding20Filled}
							placeholderGradient="from-surface-13 to-surface-6"
							class="size-full"
						/>
					</div>
				</div>
			{/if}

			<dl class="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Issued</dt>
					<dd class="font-mono text-base font-bold text-fg">{data.shares.totalShares.toLocaleString()}</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] text-fg-muted uppercase tracking-wide flex items-center gap-1">
						<FluentLockClosed20Filled class="size-3" /> Founder
					</dt>
					<dd class="font-mono text-base font-bold text-fg">
						{data.shares.founderLockedShares.toLocaleString()}
					</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] text-fg-muted uppercase tracking-wide">Issue price</dt>
					<dd class="font-mono text-base font-bold text-primary-fg">${data.shares.ipoPrice.toLocaleString()}</dd>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] text-fg-muted uppercase tracking-wide">On offer</dt>
					<dd class="font-mono text-base font-bold text-fg">{data.floatOutstanding.toLocaleString()}</dd>
				</div>
			</dl>

			<!-- Shareholder register -->
			{#if data.topHolders.length > 0}
				<div>
					<h3 class="text-[10px] uppercase tracking-wide text-fg-muted mb-2">Register of shareholders</h3>
					<ol class="divide-y divide-line/10 border-y border-line/15">
						{#each data.topHolders as holder, i (holder.userId)}
							<li class="py-2 flex items-center gap-3">
								<span class="w-5 text-right font-mono text-xs text-fg-muted shrink-0">{i + 1}</span>
								<div class="min-w-0 flex-1">
									<UserLink id={holder.userId} name={holder.name} avatar={holder.avatar} size="sm" />
									<div class="mt-1 h-1 rounded-full bg-surface-4 overflow-hidden">
										<div class="h-full rounded-full bg-primary/70" style="width: {holder.percent}%"></div>
									</div>
								</div>
								<div class="text-right shrink-0">
									<p class="font-mono text-sm text-fg-body">{holder.quantity.toLocaleString()}</p>
									<p class="font-mono text-xs text-primary-fg">{holder.percent}%</p>
								</div>
							</li>
						{/each}
					</ol>
				</div>
			{/if}

			<!-- Order book -->
			<div>
				<div class="flex items-baseline justify-between mb-2">
					<h3 class="text-[10px] uppercase tracking-wide text-fg-muted">Offers to sell</h3>
					{#if data.embargoReason}
						<span class="text-xs text-red-300">Buying blocked by embargo</span>
					{/if}
				</div>

				{#if data.listings.length > 0}
					<ul class="space-y-1.5">
						{#each data.listings as listing (listing.id)}
							<li out:vanish class="panel-muted rounded-sm px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
								<div class="min-w-0 flex-1">
									<p class="font-mono text-base font-bold text-primary-fg">
										${listing.pricePerUnit.toLocaleString()}
										<span class="font-sans text-xs font-normal text-fg-muted"
											>× {listing.quantity.toLocaleString()}</span
										>
									</p>
									{#if listing.isMine}
										<Badge tone="amber" size="xs">Your offer</Badge>
									{:else}
										<UserLink id={listing.sellerId} name={listing.sellerName} avatar={listing.sellerAvatar} size="xs" />
									{/if}
								</div>

								{#if listing.isMine}
									<form
										method="POST"
										action="?/removeShareListing"
										use:enhance={() =>
											async ({ update, result }) => {
												await update();
												toastResult(result);
											}}
									>
										<input type="hidden" name="listingId" value={listing.id} />
										<Button type="submit" variant="subtle" size="sm">Withdraw</Button>
									</form>
								{:else}
									<form
										method="POST"
										action="?/buyShareListing"
										class="flex items-center gap-2 shrink-0"
										use:enhance={() => {
											isBuying[listing.id] = true;
											const handle = settle(() => certificateEl ?? capitalEl);
											return async (args) => {
												await handle(args);
												isBuying[listing.id] = false;
											};
										}}
									>
										<input type="hidden" name="listingId" value={listing.id} />
										<input
											type="number"
											name="quantity"
											bind:value={buyQuantities[listing.id]}
											min="1"
											max={listing.quantity}
											placeholder="Qty"
											aria-label="Quantity"
											class="field-control rounded-sm px-2 py-1.5 w-20 text-sm font-mono"
											required
											disabled={!!data.embargoReason}
										/>
										<Button
											type="submit"
											variant="primary"
											size="sm"
											loading={isBuying[listing.id]}
											disabled={!!data.embargoReason}
										>
											Buy
										</Button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-fg-muted">No shares on offer.</p>
				{/if}
			</div>

			{#if data.myHolding > 0}
				<form
					method="POST"
					action="?/createShareListing"
					class="panel-muted rounded-sm p-3 grid grid-cols-2 sm:grid-cols-[8rem_8rem_auto] gap-2 items-end"
					use:enhance={() => {
						isListing = true;
						return async ({ update, result }) => {
							await update();
							isListing = false;
							toastResult(result);
						};
					}}
				>
					<div>
						<label class="field-label" for="listQuantity">Shares</label>
						<input
							id="listQuantity"
							type="number"
							name="quantity"
							bind:value={listQuantity}
							min="1"
							max={data.myHolding}
							class="field-control rounded-sm px-3 py-2 w-full font-mono"
							required
						/>
					</div>
					<div>
						<label class="field-label" for="listPrice">Price each</label>
						<input
							id="listPrice"
							type="number"
							name="pricePerUnit"
							bind:value={listPrice}
							min={data.ipoConfig.minPrice}
							class="field-control rounded-sm px-3 py-2 w-full font-mono"
							required
						/>
					</div>
					<Button type="submit" variant="secondary" loading={isListing} class="col-span-2 sm:col-span-1">
						Offer for sale
					</Button>
				</form>
			{/if}
		{/if}
	</section>

	{#if data.dividends}
		<DividendsPanel
			dividends={data.dividends}
			config={data.dividendConfig}
			budgetBalance={data.budget.balance}
			isOwner={data.isOwner}
		/>
	{/if}

	<!-- Output schedule (owner) -->
	{#if data.isOwner && data.resourceProduction.length > 0}
		<section class="panel rounded-sm p-5 sm:p-6">
			<div class="flex items-center justify-between gap-3 mb-3">
				<h2 class="section-title">Output per Shift</h2>
				<Button href="/production" variant="ghost" size="sm">Inventory</Button>
			</div>
			<ul class="space-y-3">
				{#each data.resourceProduction as resource (resource.type)}
					<li>
						<div class="flex items-baseline justify-between gap-3 text-sm">
							<span class="capitalize font-semibold text-fg-body">{resource.type}</span>
							<span class="font-mono text-fg">{resource.productionRate.toLocaleString()}</span>
						</div>
						<div class="mt-1 h-2 rounded-full bg-surface-4 overflow-hidden">
							<div
								class="h-full rounded-full bg-primary/75"
								style="width: {(resource.productionRate / maxRate) * 100}%"
							></div>
						</div>
						<p class="mt-0.5 text-xs text-fg-muted">
							{resource.factoryCount}
							{resource.factoryCount === 1 ? "factory" : "factories"} · {resource.totalWorkers}
							{resource.totalWorkers === 1 ? "worker" : "workers"}
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Works -->
	<section class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="section-title">Works</h2>
			{#if data.isOwner}
				<Button href="/factory/create" variant="secondary" size="sm" icon={FluentAdd20Filled}>New factory</Button>
			{/if}
		</div>

		{#if data.factories.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				{#each data.factories as factory (factory.id)}
					{@const fill = factory.maxWorkers ? Math.min(100, (factory.workerCount / factory.maxWorkers) * 100) : 0}
					<a href="/factory/{factory.id}" class="panel-interactive rounded-sm p-4 block group">
						<div class="flex items-start gap-3">
							<img
								loading="lazy"
								decoding="async"
								src={regionCoatUrl(factory.regionId)}
								alt=""
								class="size-9 object-contain shrink-0"
							/>
							<div class="min-w-0 flex-1">
								<h3 class="font-bold text-fg group-hover:text-primary-hover transition-colors truncate">
									{factory.name}
								</h3>
								<p class="text-xs text-fg-muted truncate">
									{getRegionName(factory.regionId)}, {factory.stateName}
								</p>
							</div>
							<Badge tone="purple" size="xs" class="capitalize shrink-0">
								{factory.resourceOutput || factory.productOutput}
							</Badge>
						</div>

						<div class="mt-3">
							<div class="flex justify-between text-xs text-fg-muted">
								<span class="flex items-center gap-1"><FluentPeople20Filled class="size-3.5" /> Workers</span>
								<span class="font-mono text-fg-body">{factory.workerCount}/{factory.maxWorkers}</span>
							</div>
							<div class="mt-1 h-1.5 rounded-full bg-surface-4 overflow-hidden">
								<div class="h-full rounded-full bg-friendly/70" style="width: {fill}%"></div>
							</div>
						</div>

						<div class="mt-3 pt-3 border-t border-line/10 flex flex-wrap gap-x-4 gap-y-1 text-xs">
							<span class="text-fg-muted"
								>Wage <span class="font-mono text-positive-fg">{factory.workerWage.toLocaleString()}</span></span
							>
							<span class="text-fg-muted"
								>Output <span class="font-mono text-friendly-fg">{factory.productionRate}/shift</span></span
							>
							{#if data.isOwner && factory.lastWorked}
								<span class="text-fg-muted sm:ml-auto">Last shift {formatDate(factory.lastWorked)}</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="panel-muted rounded-sm p-8 text-center">
				<FluentFactory20Filled class="size-10 mx-auto text-fg-muted/40 mb-2 animate-idle-float" />
				<p class="text-sm text-fg-muted">No works yet.</p>
			</div>
		{/if}
	</section>
</PageContainer>

{#if data.isOwner && data.editForm}
	<EditCompanySheet
		bind:open={showEditCompanySheet}
		editForm={data.editForm}
		currentLogo={data.company.logo}
		foundedAt={data.company.foundedAt}
		factoryCount={data.factories.length}
		workerCount={data.totalWorkers}
		editCost={data.companyEditCost}
		userBalance={data.ownerBalance}
		canAfford={data.ownerBalance >= data.companyEditCost}
		isOnCooldown={data.isCompanyEditOnCooldown}
		cooldownEndsAt={data.companyEditCooldownEndsAt}
		cooldownHours={data.companyEditCooldownHours}
	/>
{/if}
