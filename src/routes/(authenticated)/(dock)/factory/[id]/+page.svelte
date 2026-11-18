<!-- src/routes/factory/[id]/+page.svelte -->
<!-- A factory as its works card: plaque with operator and site, a load gauge
     for the crew, and a punch-style time card for the viewer's shift. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import type { SubmitFunction } from "$app/forms";
	import { refreshAll } from "$app/navigation";
	import { getRegionName, regionCoatUrl } from "#lib/utils/formatting.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import Logo from "#lib/component/Logo.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import { Badge, Button, IconButton } from "#lib/component/ui/index.js";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentFlash20Filled from "~icons/fluent/flash-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentPlay20Filled from "~icons/fluent/play-20-filled";
	import FluentEdit20Filled from "~icons/fluent/edit-20-filled";
	import FluentImageOff20Filled from "~icons/fluent/image-off-20-filled";
	import FluentLockClosed20Filled from "~icons/fluent/lock-closed-20-filled";
	import EditFactorySheet from "./EditFactorySheet.svelte";

	let { data } = $props();

	let showEditFactorySheet = $state(false);
	let timeCard = $state<HTMLElement>();
	let busy = $state(false);
	let justPaid = $state(false);
	let gaugeReady = $state(false);
	let now = $state(Date.now());

	const SHIFT_MS = 8 * 3600000;

	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 30000);
		// Let the needle sweep in from zero once.
		const raf = requestAnimationFrame(() => (gaugeReady = true));
		return () => {
			clearInterval(t);
			cancelAnimationFrame(raf);
		};
	});

	$effect(() => {
		if (data.isCurrentlyWorking && data.shiftEndsAt) {
			const interval = setInterval(() => {
				if (new Date(data.shiftEndsAt!) <= new Date()) {
					refreshAll();
				}
			}, 60000);
			return () => clearInterval(interval);
		}
	});

	const timeRemaining = $derived.by(() => {
		if (!data.isCurrentlyWorking || !data.shiftEndsAt) return "";
		const remaining = new Date(data.shiftEndsAt).getTime() - now;
		if (remaining <= 0) return "0h 0m";
		const hours = Math.floor(remaining / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);
		return `${hours}h ${minutes}m`;
	});

	const clockOut = $derived(data.shiftEndsAt ? new Date(data.shiftEndsAt) : null);
	const clockIn = $derived(clockOut ? new Date(clockOut.getTime() - SHIFT_MS) : null);

	const regionName = $derived(getRegionName(data.factory.regionId));
	const displayWage = $derived(data.lockedWage || data.factory.workerWage);
	const hasLockedWage = $derived(data.lockedWage !== null);
	const isFull = $derived(data.workers >= data.maxWorkers);

	const crewPct = $derived(data.maxWorkers > 0 ? Math.min(100, (data.workers / data.maxWorkers) * 100) : 0);
	const energyFree = $derived(
		data.stateEnergy ? data.stateEnergy.totalProduction - data.stateEnergy.usedProduction : 0
	);
	const energyPct = $derived(
		data.stateEnergy && data.stateEnergy.totalProduction > 0 ? (energyFree / data.stateEnergy.totalProduction) * 100 : 0
	);

	const blocker = $derived(
		data.embargoReason
			? data.embargoReason
			: !data.canAffordWage
				? "Company can't cover the wage"
				: !data.isWorkingHere && isFull
					? "All posts are filled"
					: null
	);

	function hhmm(d: Date | null) {
		if (!d) return "--:--";
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	const onShift: SubmitFunction = () => {
		busy = true;
		return async ({ update, result }) => {
			await update();
			busy = false;
			if (result.type === "success") celebrate(timeCard);
			else toastResult(result);
		};
	};

	const onCollect: SubmitFunction = () => {
		busy = true;
		return async ({ update, result }) => {
			await update();
			busy = false;
			if (result.type === "success") {
				justPaid = true;
				celebrate(timeCard);
			} else toastResult(result);
		};
	};

	// Gauge arc: a half circle from 180° to 0°.
	const needleDeg = $derived(gaugeReady ? -90 + crewPct * 1.8 : -90);
</script>

<svelte:head>
	<title>{`${data.factory.name} · PsyOps`}</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<!-- Works plaque -->
	<header class="panel rounded-sm p-5 relative">
		{#if data.isOwner}
			<IconButton
				icon={FluentEdit20Filled}
				label="Edit factory"
				variant="secondary"
				size="sm"
				class="absolute top-3 right-3"
				onclick={() => (showEditFactorySheet = true)}
			/>
		{/if}

		<p class="text-[10px] uppercase tracking-[0.25em] text-[#8e9abb] font-mono">Works No. {data.factory.id}</p>
		<div class="mt-2 flex items-center gap-4 pr-10">
			<Logo
				src={data.companyLogoUrl}
				alt={data.factory.companyName}
				class="size-14 sm:size-16 rounded-sm border border-[#8ea6e0]/20 shrink-0"
				placeholderIcon={FluentImageOff20Filled}
			/>
			<div class="min-w-0">
				<h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#eef2ff] break-words leading-tight">
					{data.factory.name}
				</h1>
				<div class="mt-1 flex flex-wrap items-center gap-2">
					<Badge tone="purple" class="capitalize">{data.factory.factoryType}</Badge>
					{#if data.output}
						<span class="inline-flex items-center gap-1 text-xs text-[#c2cbe3] capitalize">
							<ResourceIcon name={data.output.name} class="size-4" />
							{data.output.name}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<dl class="mt-4 pt-4 border-t border-[#8ea6e0]/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
			<div class="min-w-0">
				<dt class="text-[10px] text-[#8e9abb] uppercase tracking-wide mb-1">Operator</dt>
				<dd>
					<a
						href="/company/{data.factory.companyId}"
						class="font-semibold text-[#e6dcff] hover:text-[#ffc857] transition-colors truncate block"
					>
						{data.factory.companyName}
					</a>
				</dd>
			</div>
			<div class="min-w-0">
				<dt class="text-[10px] text-[#8e9abb] uppercase tracking-wide mb-1">Proprietor</dt>
				<dd><UserLink id={data.owner.id} name={data.owner.name} avatar={data.owner.avatar} size="xs" /></dd>
			</div>
			<div class="min-w-0">
				<dt class="text-[10px] text-[#8e9abb] uppercase tracking-wide mb-1">Site</dt>
				<dd>
					<a href="/region/{data.factory.regionId}" class="group inline-flex items-center gap-2 min-w-0">
						<img
							loading="lazy"
							decoding="async"
							src={regionCoatUrl(data.factory.regionId)}
							alt=""
							class="size-5 object-contain shrink-0"
						/>
						<span class="truncate text-[#eef2ff] group-hover:text-[#ffc857] transition-colors">
							{regionName}<span class="text-[#8e9abb]">, {data.factory.stateName}</span>
						</span>
					</a>
				</dd>
			</div>
		</dl>
	</header>

	<div class="grid gap-4 md:grid-cols-2">
		<!-- Crew gauge -->
		<section class="panel rounded-sm p-5 flex flex-col items-center">
			<h2 class="section-title self-start">Floor</h2>
			<svg
				viewBox="0 0 120 72"
				class="w-full max-w-[240px] mt-2"
				role="img"
				aria-label="Crew {data.workers} of {data.maxWorkers}"
			>
				<path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="#131c33" stroke-width="9" stroke-linecap="round" />
				<path
					d="M12 62 A48 48 0 0 1 108 62"
					fill="none"
					stroke={isFull ? "#4fd88a" : "#f5a524"}
					stroke-width="9"
					stroke-linecap="round"
					pathLength="100"
					stroke-dasharray="{gaugeReady ? crewPct : 0} 100"
					class="gauge-arc"
				/>
				{#each [0, 25, 50, 75, 100] as t}
					<line
						x1="60"
						y1="8"
						x2="60"
						y2="13"
						stroke="#8e9abb"
						stroke-width="1"
						transform="rotate({-90 + t * 1.8} 60 62)"
					/>
				{/each}
				<g class="gauge-needle" style="transform: rotate({needleDeg}deg)">
					<line x1="60" y1="62" x2="60" y2="22" stroke="#eef2ff" stroke-width="2" stroke-linecap="round" />
				</g>
				<circle cx="60" cy="62" r="4" fill="#233154" stroke="#8ea6e0" stroke-width="1" />
			</svg>
			<p class="-mt-1 text-2xl font-bold text-[#eef2ff] font-mono">
				{data.workers}<span class="text-[#8e9abb] text-base">/{data.maxWorkers}</span>
			</p>
			<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Crew on the books</p>

			<div class="mt-4 w-full grid grid-cols-2 gap-2">
				<div class="panel-muted rounded-sm p-3">
					<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Output / shift</p>
					<p class="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-[#eef2ff]">
						{#if data.output}
							<ResourceIcon name={data.output.name} class="size-4" />
							<span class="font-mono">{data.output.amount}</span>
						{:else}
							—
						{/if}
					</p>
				</div>
				<div class="panel-muted rounded-sm p-3">
					<p class="text-[10px] text-[#8e9abb] uppercase tracking-wide">Wage / shift</p>
					<p class="mt-0.5 text-sm font-bold text-[#aef3c9] font-mono">{data.factory.workerWage.toLocaleString()}</p>
				</div>
			</div>

			{#if data.stateEnergy}
				<div class="mt-3 w-full">
					<div class="flex items-center justify-between text-xs mb-1">
						<span class="flex items-center gap-1 text-[#8e9abb]">
							<FluentFlash20Filled class="size-3.5 text-[#ffcb6b]" /> Grid
						</span>
						<span class="font-mono text-[#c2cbe3]">{energyFree}/{data.stateEnergy.totalProduction} MW</span>
					</div>
					<div class="h-1.5 bg-[#131c33] rounded-full overflow-hidden border border-[#8ea6e0]/10">
						<div class="h-full bg-[#f5a524] rounded-full transition-all duration-700" style="width: {energyPct}%"></div>
					</div>
				</div>
			{/if}

			{#if !data.canAffordWage}
				<p class="mt-3 w-full text-xs text-red-300 flex items-center gap-1.5">
					<FluentWarning20Filled class="size-3.5 text-red-400 shrink-0" />
					Budget <span class="font-mono">{data.companyBudget.toLocaleString()}</span> — below one wage
				</p>
			{/if}
		</section>

		<!-- Time card -->
		<section bind:this={timeCard} class="panel rounded-sm p-5 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<h2 class="section-title">Time card</h2>
				{#if data.isCurrentlyWorking}
					<Badge tone="amber">
						<span class="size-1.5 rounded-full bg-[#f5a524] animate-pulse"></span>
						On shift
					</Badge>
				{:else if data.isWorkingHere}
					<Badge tone="green">Employed</Badge>
				{/if}
			</div>

			<div class="mt-3 panel-muted rounded-sm font-mono text-sm divide-y divide-dashed divide-[#8ea6e0]/20">
				<div class="flex items-center justify-between px-3 py-2">
					<span class="text-[10px] uppercase tracking-wide text-[#8e9abb] font-sans">In</span>
					<span class="text-[#eef2ff]">{data.isCurrentlyWorking ? hhmm(clockIn) : "--:--"}</span>
				</div>
				<div class="flex items-center justify-between px-3 py-2">
					<span class="text-[10px] uppercase tracking-wide text-[#8e9abb] font-sans">Out</span>
					<span class="text-[#eef2ff]">{data.isCurrentlyWorking ? hhmm(clockOut) : "--:--"}</span>
				</div>
				<div class="flex items-center justify-between px-3 py-2">
					<span class="text-[10px] uppercase tracking-wide text-[#8e9abb] font-sans">Rate</span>
					<span class="flex items-center gap-1.5 text-[#aef3c9]">
						{#if hasLockedWage}
							<FluentLockClosed20Filled class="size-3.5 text-[#b9a1ff]" />
						{/if}
						{displayWage.toLocaleString()}
					</span>
				</div>
				{#if data.output}
					<div class="flex items-center justify-between px-3 py-2">
						<span class="text-[10px] uppercase tracking-wide text-[#8e9abb] font-sans">Yield</span>
						<span class="flex items-center gap-1.5 text-[#eef2ff]">
							<ResourceIcon name={data.output.name} class="size-4" />
							{data.output.amount}
						</span>
					</div>
				{/if}
			</div>

			{#if data.isCurrentlyWorking}
				<div class="mt-4">
					<div class="flex items-center justify-between text-xs mb-1.5">
						<span class="text-[#8e9abb]">8h shift</span>
						<span class="font-mono font-bold text-[#ffcb6b]">{data.shiftProgress >= 100 ? "Done" : timeRemaining}</span>
					</div>
					<div class="h-2.5 bg-[#131c33] rounded-full overflow-hidden border border-[#f5a524]/20">
						<div
							class="h-full bg-[#f5a524] transition-all duration-1000 rounded-full"
							style="width: {data.shiftProgress}%"
						></div>
					</div>
				</div>

				{#if data.shiftProgress >= 100}
					<form method="POST" action="?/collectPayment" use:enhance={onCollect} class="mt-4">
						<Button type="submit" variant="primary" block loading={busy} icon={FluentCheckmark20Filled}>
							Collect {displayWage.toLocaleString()}
						</Button>
					</form>
				{/if}
			{:else}
				{#if data.currentUserJob && !data.isWorkingHere && !blocker}
					<p class="mt-3 text-xs text-[#ffcb6b]">Starting here ends your current job.</p>
				{/if}
				{#if blocker}
					<p class="mt-3 text-xs text-red-300 flex items-center gap-1.5">
						<FluentWarning20Filled class="size-3.5 text-red-400 shrink-0" />
						{blocker}
					</p>
				{/if}
				<form method="POST" action="?/startShift" use:enhance={onShift} class="mt-4">
					<Button type="submit" variant="primary" block loading={busy} icon={FluentPlay20Filled} disabled={!!blocker}>
						{data.currentUserJob && !data.isWorkingHere ? "Transfer & clock in" : "Clock in"}
					</Button>
				</form>
			{/if}

			{#if justPaid && !data.isCurrentlyWorking}
				<span
					class="animate-stamp pointer-events-none absolute top-10 right-4 border-2 border-[#4fd88a]/70 text-[#aef3c9] rounded-sm px-2 py-0.5 font-serif text-sm font-black uppercase tracking-widest"
					style="--stamp-tilt: -12deg; transform: rotate(-12deg)"
				>
					Paid
				</span>
			{/if}
		</section>
	</div>
</PageContainer>

<!-- Edit Factory Bottom Sheet -->
{#if data.isOwner && data.editForm}
	<EditFactorySheet
		bind:open={showEditFactorySheet}
		editForm={data.editForm}
		factory={{
			id: data.factory.id,
			name: data.factory.name,
			workerWage: data.factory.workerWage,
			currentWorkers: data.workers
		}}
		editCost={data.factoryEditCost}
		userBalance={data.userBalance}
		canAfford={data.canAffordFactoryEdit}
		isOnCooldown={data.isFactoryEditOnCooldown}
		cooldownEndsAt={data.factoryEditCooldownEndsAt}
		wageStats={data.wageStats}
	/>
{/if}

<style>
	.gauge-arc {
		transition: stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.gauge-needle {
		transform-origin: 60px 62px;
		transform-box: view-box;
		transition: transform 900ms cubic-bezier(0.34, 1.4, 0.5, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.gauge-arc,
		.gauge-needle {
			transition: none;
		}
	}
</style>
