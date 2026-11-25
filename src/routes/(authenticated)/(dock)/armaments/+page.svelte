<!-- src/routes/(authenticated)/(dock)/armaments/+page.svelte -->
<!-- The arms exchange: a console with the trader's funds and stock, a card per
     piece of hardware (guide price, 7-day trend, stats, supply and the best
     offer), a drawer to compare, buy and sell, the order book with its depth,
     the trade tape, the licence desk for the state's defence office and the
     trader's own offers and shipments. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import type { Component } from "svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge, Button, OddsRing, SearchSelect } from "#lib/component/ui/index.js";
	import { toast, toastResult } from "#lib/ui/toast.svelte.js";
	import {
		conditionGrade,
		deliveryHours,
		levyPercent,
		type ArmamentCategory,
		type ArmamentGood,
		type ArmamentStats,
		type ArmsRoute
	} from "#lib/config/game/armaments.config.js";
	import TrendLine from "./TrendLine.svelte";
	import DepthChart from "./DepthChart.svelte";
	import IconShield from "~icons/fluent/shield-20-regular";
	import IconWallet from "~icons/fluent/wallet-20-regular";
	import IconBox from "~icons/fluent/box-multiple-20-regular";
	import IconTruck from "~icons/fluent/vehicle-truck-profile-20-regular";
	import IconCertificate from "~icons/fluent/certificate-20-regular";
	import IconTarget from "~icons/fluent/target-20-regular";
	import IconBox2 from "~icons/fluent/box-20-regular";
	import IconFire from "~icons/fluent/fire-20-regular";
	import IconFlash from "~icons/fluent/flash-20-regular";
	import IconTruckBig from "~icons/fluent/vehicle-truck-20-regular";
	import IconTrendUp from "~icons/fluent/arrow-trending-20-regular";
	import IconTrendDown from "~icons/fluent/arrow-trending-down-20-regular";
	import IconDismiss from "~icons/fluent/dismiss-20-regular";
	import IconScales from "~icons/fluent/scales-20-regular";
	import IconGlobe from "~icons/fluent/globe-20-regular";
	import IconGov from "~icons/fluent/building-government-20-regular";
	import IconProhibited from "~icons/fluent/prohibited-20-regular";
	import IconHistory from "~icons/fluent/history-20-regular";
	import IconTag from "~icons/fluent/tag-20-regular";
	import IconCart from "~icons/fluent/shopping-bag-20-regular";
	import IconClock from "~icons/fluent/clock-20-regular";
	import IconHistogram from "~icons/fluent/data-histogram-20-regular";
	import IconCheck from "~icons/fluent/checkmark-circle-20-regular";
	import IconUndo from "~icons/fluent/arrow-undo-20-regular";
	import IconInfo from "~icons/fluent/info-20-regular";
	import IconArrowRight from "~icons/fluent/arrow-right-20-regular";

	let { data } = $props();

	type Good = (typeof data.goods)[number];
	type Offer = (typeof data.offers)[number];

	const GOOD_ICON: Record<ArmamentGood, Component> = {
		rifles: IconTarget,
		ammunition: IconBox2,
		artillery: IconFire,
		explosives: IconFlash,
		vehicles: IconTruckBig
	};
	const CATEGORY_TINT: Record<ArmamentCategory, string> = {
		small_arms: "bg-friendly/15 text-friendly-fg",
		heavy: "bg-hostile/15 text-hostile-fg",
		armour: "bg-primary/15 text-primary-fg"
	};
	const STAT_LABEL: Record<keyof ArmamentStats, string> = {
		firepower: "Firepower",
		range: "Range",
		mobility: "Mobility",
		logistics: "Logistics"
	};
	const ROUTE: Record<ArmsRoute, { label: string; tone: "green" | "blue" | "amber" }> = {
		domestic: { label: "Domestic", tone: "green" },
		bloc: { label: "Bloc", tone: "blue" },
		foreign: { label: "Foreign", tone: "amber" }
	};
	const GRADE_LABEL = { new: "New", good: "Good", worn: "Worn", battered: "Battered" } as const;

	const profile = (good: string) => data.profiles[good as ArmamentGood];
	const money = (n: number) =>
		n >= 1_000_000
			? `$${+(n / 1_000_000).toFixed(1)}M`
			: n >= 10_000
				? `$${+(n / 1000).toFixed(1)}k`
				: `$${Math.round(n).toLocaleString("en-US")}`;
	const units = (n: number) => n.toLocaleString("en-US");
	const change = (trend: number[]) =>
		trend.length > 1 && trend[0]! > 0 ? ((trend[trend.length - 1]! - trend[0]!) / trend[0]!) * 100 : 0;
	const conditionTone = (c: number) =>
		c >= 75 ? "var(--color-positive)" : c >= 50 ? "var(--color-warning)" : "var(--color-hostile)";

	// ── Live clock for ETAs ───────────────────────────────────────────────
	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 20_000);
		return () => clearInterval(t);
	});
	const eta = (arrives: Date | string) => {
		const ms = new Date(arrives).getTime() - now;
		if (ms <= 0) return "arriving";
		const total = Math.ceil(ms / 60_000);
		const h = Math.floor(total / 60);
		const m = total % 60;
		return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
	};
	const progress = (from: Date | string, to: Date | string) => {
		const a = new Date(from).getTime();
		const b = new Date(to).getTime();
		return Math.max(0, Math.min(1, (now - a) / (b - a || 1)));
	};
	const ago = (d: Date | string) => {
		const ms = now - new Date(d).getTime();
		const m = Math.floor(ms / 60_000);
		if (m < 60) return `${Math.max(1, m)} min ago`;
		const h = Math.floor(m / 60);
		return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
	};

	// ── Filters ───────────────────────────────────────────────────────────
	let category = $state<"all" | ArmamentCategory>("all");
	let reachableOnly = $state(false);

	const offersOf = (good: string) => data.offers.filter((o) => o.good === good && !o.mine);
	const bestAsk = (good: string) => {
		const list = offersOf(good);
		return list.find((o) => !o.blocker) ?? list[0] ?? null;
	};
	const cards = $derived(
		data.goods.filter(
			(g) =>
				(category === "all" || profile(g.good).category === category) &&
				(!reachableOnly || offersOf(g.good).some((o) => !o.blocker))
		)
	);

	// ── Header figures ────────────────────────────────────────────────────
	const stockUnits = $derived(data.goods.reduce((n, g) => n + g.held, 0));
	const stockValue = $derived(data.goods.reduce((n, g) => n + g.fresh * g.guide + g.used * g.usedGuide, 0));
	const inTransit = $derived(data.deliveries.filter((d) => !d.deliveredAt));
	const reachable = $derived(data.offers.filter((o) => !o.mine && !o.blocker).length);

	// ── Order book ────────────────────────────────────────────────────────
	let bookGood = $state<string>("rifles");
	const book = $derived(offersOf(bookGood));
	const bookMeta = $derived(data.goods.find((g) => g.good === bookGood)!);
	const bookMax = $derived(Math.max(1, ...book.map((o) => o.quantity)));

	// ── Drawer ────────────────────────────────────────────────────────────
	let dialog: HTMLDialogElement | undefined = $state();
	let drawerGood = $state<string | null>(null);
	let compareGood = $state<string>("");
	let tab = $state<"buy" | "sell">("buy");
	const drawer = $derived(drawerGood ? (data.goods.find((g) => g.good === drawerGood) ?? null) : null);
	const compare = $derived(compareGood ? (data.goods.find((g) => g.good === compareGood) ?? null) : null);

	function openDrawer(good: string, mode: "buy" | "sell" = "buy", offerId: number | null = null) {
		drawerGood = good;
		tab = mode;
		compareGood = "";
		const list = offersOf(good);
		pickedId = offerId ?? (list.find((o) => !o.blocker) ?? list[0])?.id ?? null;
		buyQty = 1;
		const g = data.goods.find((x) => x.good === good)!;
		grade = g.fresh > 0 || g.used === 0 ? "new" : "used";
		sellQty = Math.max(1, Math.min(10, grade === "new" ? g.fresh : g.used));
		price = grade === "new" ? g.guide : g.usedGuide;
		buyerMode = "open";
		targetId = undefined;
		dialog?.showModal();
	}
	const closeDrawer = () => dialog?.close();

	// Buy
	let pickedId = $state<number | null>(null);
	let buyQty = $state(1);
	const picked = $derived(drawer ? (offersOf(drawer.good).find((o) => o.id === pickedId) ?? null) : null);
	const buyTotal = $derived(picked ? picked.pricePerUnit * buyQty : 0);
	const buyBlock = $derived(
		!picked
			? "Pick an offer."
			: picked.blocker
				? picked.blocker
				: !Number.isInteger(buyQty) || buyQty < 1 || buyQty > picked.quantity
					? `Choose 1 to ${units(picked.quantity)} units.`
					: buyTotal > data.wallet
						? "Your wallet can't cover it."
						: null
	);

	// Sell
	let grade = $state<"new" | "used">("new");
	let sellQty = $state(1);
	let price = $state(1);
	let buyerMode = $state<"open" | "state">("open");
	let targetId = $state<string | undefined>();
	const sellAvail = $derived(drawer ? (grade === "new" ? drawer.fresh : drawer.used) : 0);
	const sellBand = $derived(drawer ? (grade === "new" ? drawer.band : drawer.usedBand) : { min: 1, max: 1 });
	const sellGuide = $derived(drawer ? (grade === "new" ? drawer.guide : drawer.usedGuide) : 1);
	const sellCondition = $derived(drawer ? (grade === "new" ? 100 : drawer.usedCondition) : 100);
	const target = $derived(
		buyerMode === "state" && targetId ? (data.states.find((s) => String(s.id) === targetId) ?? null) : null
	);
	const sellRoute = $derived<ArmsRoute>(target ? target.route : "domestic");
	const sellLevy = $derived(levyPercent(sellRoute));
	const proceeds = $derived(Math.floor(sellQty * price * (1 - sellLevy / 100)));
	const stateItems = $derived(
		data.states
			.filter((s) => s.id !== data.state?.id)
			.map((s) => ({
				id: s.id,
				name: s.name,
				hint: s.route === "foreign" ? "foreign · licence needed" : "bloc partner"
			}))
	);
	const sellBlock = $derived(
		!data.state
			? "You need a residence to trade arms."
			: sellAvail < 1
				? grade === "new"
					? "You hold no new units of this."
					: "You hold no second-hand units of this."
				: !Number.isInteger(sellQty) || sellQty < 1 || sellQty > sellAvail
					? `Choose 1 to ${units(sellAvail)} units.`
					: !Number.isInteger(price) || price < sellBand.min || price > sellBand.max
						? `Price must be ${units(sellBand.min)}–${units(sellBand.max)}.`
						: buyerMode === "state" && !target
							? "Choose the buying state."
							: null
	);

	const submit =
		(after?: () => void) =>
		() =>
		async ({ result, update }: { result: { type: string; data?: unknown }; update: () => Promise<void> }) => {
			await update();
			toastResult(result);
			const message = (result.data as { message?: unknown } | undefined)?.message;
			if (result.type === "success") {
				if (typeof message === "string") toast.success(message);
				after?.();
			}
		};
</script>

<svelte:head><title>Armaments exchange · PsyOps</title></svelte:head>

<PageContainer maxWidth="6xl">
	<!-- Console header -->
	<header class="panel arms-hero relative overflow-hidden rounded-sm">
		<div class="relative flex flex-wrap items-center gap-4 p-4 sm:p-5">
			<span
				class="grid size-14 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-fg ring-1 ring-primary/30"
			>
				<IconShield class="size-7" />
			</span>
			<div class="min-w-0 flex-1">
				<p class="section-title">Arms exchange</p>
				<h1 class="mt-0.5 font-serif text-2xl leading-tight font-bold text-fg sm:text-3xl">Armaments market</h1>
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#if data.state}
						<Badge tone="blue" icon={IconGov}>Trading from {data.state.name}</Badge>
					{:else}
						<Badge tone="red" icon={IconProhibited}>No residence — trading closed</Badge>
					{/if}
					{#if data.authority}
						<Badge tone="amber" icon={IconCertificate}>
							Licensing office · {data.authority === "president" ? "president" : "defence minister"}
						</Badge>
					{/if}
				</div>
			</div>
		</div>
		<dl class="relative grid grid-cols-2 border-t border-line/15 sm:grid-cols-4">
			<div class="flex min-w-0 items-center gap-2.5 p-3">
				<IconWallet class="size-5 shrink-0 text-positive-fg" />
				<div class="min-w-0">
					<dt class="section-title">Treasury</dt>
					<dd class="data truncate text-lg text-fg">{money(data.wallet)}</dd>
				</div>
			</div>
			<div class="flex min-w-0 items-center gap-2.5 p-3">
				<IconBox class="size-5 shrink-0 text-primary-fg" />
				<div class="min-w-0">
					<dt class="section-title">Stock</dt>
					<dd class="data truncate text-lg text-fg">{units(stockUnits)}</dd>
					<dd class="truncate text-[11px] text-fg-faint">≈ {money(stockValue)} at guide</dd>
				</div>
			</div>
			<div class="flex min-w-0 items-center gap-2.5 p-3">
				<IconTruck class="size-5 shrink-0 text-friendly-fg" />
				<div class="min-w-0">
					<dt class="section-title">In transit</dt>
					<dd class="data text-lg text-fg">{inTransit.length}</dd>
					<dd class="truncate text-[11px] text-fg-faint">
						{inTransit.length ? `next ${eta(inTransit[0]!.arrivesAt)}` : "nothing shipping"}
					</dd>
				</div>
			</div>
			<div class="flex min-w-0 items-center gap-2.5 p-3">
				<IconCart class="size-5 shrink-0 text-warning" />
				<div class="min-w-0">
					<dt class="section-title">Within reach</dt>
					<dd class="data text-lg text-fg">{reachable}</dd>
					<dd class="truncate text-[11px] text-fg-faint">
						{data.licenceQueue.length ? `${data.licenceQueue.length} licence request(s)` : "offers you can buy"}
					</dd>
				</div>
			</div>
		</dl>
	</header>

	<!-- Category tabs -->
	<div class="mt-4 flex flex-wrap items-center justify-between gap-2">
		<div class="flex max-w-full gap-1 overflow-x-auto rounded-sm bg-surface-3 p-1" role="tablist" aria-label="Category">
			{#each [{ id: "all", label: "All" }, ...data.categories] as c (c.id)}
				<button
					type="button"
					role="tab"
					aria-selected={category === c.id}
					class="shrink-0 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors {category === c.id
						? 'bg-surface-7 text-fg shadow-sm'
						: 'text-fg-muted hover:text-fg'}"
					onclick={() => (category = c.id as typeof category)}
				>
					{c.label}
				</button>
			{/each}
		</div>
		<label class="flex items-center gap-2 text-xs text-fg-muted">
			<input type="checkbox" bind:checked={reachableOnly} class="accent-(--color-primary)" />
			Only what I can buy
		</label>
	</div>

	<!-- Equipment cards -->
	<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each cards as g, i (g.good)}
			{@const p = profile(g.good)}
			{@const Icon = GOOD_ICON[g.good as ArmamentGood]}
			{@const pct = change(g.trend)}
			{@const ask = bestAsk(g.good)}
			<article class="panel animate-rise-in flex min-w-0 flex-col rounded-sm p-3" style="--rise-delay: {i * 40}ms">
				<button
					type="button"
					class="flex min-w-0 items-start gap-3 text-left"
					onclick={() => openDrawer(g.good)}
					aria-label="Open {p.label}"
				>
					<span class="grid size-11 shrink-0 place-items-center rounded-sm {CATEGORY_TINT[p.category]}">
						<Icon class="size-6" />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate font-semibold text-fg">{p.label}</span>
						<span class="block text-[11px] text-fg-faint">
							{data.categories.find((c) => c.id === p.category)?.label}
						</span>
					</span>
					<span class="shrink-0 text-right">
						<span class="data block text-base text-fg">{money(g.guide)}</span>
						<span
							class="inline-flex items-center gap-0.5 text-[11px] {pct > 0.5
								? 'text-positive-fg'
								: pct < -0.5
									? 'text-hostile-fg'
									: 'text-fg-faint'}"
						>
							{#if pct > 0.5}<IconTrendUp class="size-3.5" />{:else if pct < -0.5}<IconTrendDown
									class="size-3.5"
								/>{/if}
							{pct > 0 ? "+" : ""}{pct.toFixed(1)}% · 7d
						</span>
					</span>
				</button>

				<TrendLine prices={g.trend} class="mt-2 h-9 w-full" label="{p.label} price over seven days" />

				<dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
					{#each Object.entries(p.stats) as [key, value] (key)}
						<div class="min-w-0">
							<dt class="flex justify-between text-[10px] tracking-wide text-fg-faint uppercase">
								<span>{STAT_LABEL[key as keyof ArmamentStats]}</span><span class="data">{value}</span>
							</dt>
							<dd class="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-7">
								<span class="block h-full rounded-full bg-primary" style:width="{value * 10}%"></span>
							</dd>
						</div>
					{/each}
				</dl>

				<div class="mt-3 grid grid-cols-3 gap-2 border-t border-line/10 pt-2 text-[11px]">
					<div class="min-w-0">
						<p class="text-fg-faint">Supply</p>
						<p class="data truncate text-fg">{units(g.supply)}</p>
					</div>
					<div class="min-w-0">
						<p class="text-fg-faint">Traded 7d</p>
						<p class="data truncate text-fg">{units(g.demand)}</p>
					</div>
					<div class="min-w-0">
						<p class="text-fg-faint">Your stock</p>
						<p class="data truncate text-fg">
							{units(g.held)}{#if g.used}<span class="text-fg-faint">&nbsp;· {units(g.used)} used</span>{/if}
						</p>
					</div>
				</div>

				<div class="mt-2 flex min-w-0 items-center gap-2 rounded-sm bg-surface-3 px-2 py-1.5 text-[11px]">
					{#if ask}
						<IconTag class="size-3.5 shrink-0 text-fg-faint" />
						<span class="min-w-0 flex-1 truncate text-fg-muted">
							from <span class="data text-fg">{money(ask.pricePerUnit)}</span> · {ask.sellerName}
						</span>
						{#if ask.blocker}
							<IconProhibited class="size-3.5 shrink-0 text-hostile-fg" aria-label="Out of reach" />
						{:else}
							<Badge tone={ROUTE[ask.route].tone} size="xs">{ROUTE[ask.route].label}</Badge>
						{/if}
					{:else}
						<span class="text-fg-faint">No offers right now</span>
					{/if}
				</div>

				<div class="mt-2 flex gap-2">
					<Button
						size="xs"
						variant="primary"
						grow
						onclick={() => openDrawer(g.good, "buy")}
						disabled={!offersOf(g.good).length}
					>
						Buy
					</Button>
					<Button size="xs" variant="secondary" grow onclick={() => openDrawer(g.good, "sell")} disabled={!g.held}>
						Sell
					</Button>
				</div>
			</article>
		{:else}
			<p class="panel p-4 text-sm text-fg-muted sm:col-span-2 lg:col-span-3">
				Nothing in this category is within reach.
			</p>
		{/each}
	</div>

	<!-- Order book and tape -->
	<div class="mt-4 grid gap-4 lg:grid-cols-5">
		<section class="panel min-w-0 rounded-sm p-4 lg:col-span-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="section-title flex items-center gap-1.5"><IconHistogram class="size-4" /> Order book</h2>
				<div class="flex max-w-full gap-1 overflow-x-auto">
					{#each data.goods as g (g.good)}
						<button
							type="button"
							class="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors {bookGood === g.good
								? 'border-primary/50 bg-primary/15 text-primary-fg'
								: 'border-line/20 text-fg-muted hover:text-fg'}"
							onclick={() => (bookGood = g.good)}
							aria-pressed={bookGood === g.good}
						>
							{profile(g.good).label}
						</button>
					{/each}
				</div>
			</div>
			<div class="mt-3">
				<DepthChart
					asks={book.map((o) => ({ price: o.pricePerUnit, quantity: o.quantity, buyable: !o.blocker }))}
					guide={bookMeta.guide}
					label="Depth of offers for {profile(bookGood).label}"
				/>
			</div>
			<p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-fg-faint">
				<span class="inline-flex items-center gap-1">
					<span class="size-2 rounded-xs bg-primary/40"></span> within reach
				</span>
				<span class="inline-flex items-center gap-1">
					<span class="hatch size-2 rounded-xs"></span> needs a licence or embargoed
				</span>
				<span>Band {money(bookMeta.band.min)}–{money(bookMeta.band.max)}</span>
			</p>
			{#if book.length}
				<ul class="mt-3 divide-y divide-line/10">
					{#each book as o (o.id)}
						<li class="relative flex min-w-0 items-center gap-3 py-2">
							<span
								class="pointer-events-none absolute inset-y-1 left-0 rounded-xs {o.blocker
									? 'bg-surface-6'
									: 'bg-primary/10'}"
								style:width="{(o.quantity / bookMax) * 100}%"
							></span>
							<span class="data relative w-16 shrink-0 text-sm text-fg">{money(o.pricePerUnit)}</span>
							<span class="relative min-w-0 flex-1">
								<span class="block truncate text-xs text-fg">{units(o.quantity)} × · {o.sellerName}</span>
								<span class="block truncate text-[10px] text-fg-faint">
									{o.sellerStateName}{o.targetName ? ` → ${o.targetName}` : ""} · {GRADE_LABEL[
										conditionGrade(o.condition)
									]}
								</span>
							</span>
							<OddsRing
								value={o.condition / 100}
								size={28}
								color={conditionTone(o.condition)}
								label="Condition"
								textClass="text-[9px]"
							/>
							<Button
								size="xs"
								variant={o.blocker ? "ghost" : "secondary"}
								onclick={() => openDrawer(o.good, "buy", o.id)}
							>
								{o.blocker ? "View" : "Trade"}
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="panel min-w-0 rounded-sm p-4 lg:col-span-2">
			<h2 class="section-title flex items-center gap-1.5"><IconHistory class="size-4" /> Recent trades</h2>
			{#if data.trades.length}
				<ol class="mt-3 max-h-[26rem] space-y-1 overflow-y-auto pr-1">
					{#each data.trades as t (t.id)}
						{@const Icon = GOOD_ICON[t.good as ArmamentGood]}
						<li class="flex min-w-0 items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-surface-3">
							<Icon class="size-4 shrink-0 text-fg-faint" />
							<span class="min-w-0 flex-1">
								<span class="block truncate text-xs text-fg">
									{units(t.quantity)}
									{profile(t.good).label.toLowerCase()} @ <span class="data">{money(t.pricePerUnit)}</span>
								</span>
								<span class="block truncate text-[10px] text-fg-faint">{t.from} → {t.to} · {ago(t.createdAt)}</span>
							</span>
							<Badge tone={ROUTE[t.route as ArmsRoute]?.tone ?? "neutral"} size="xs">
								{ROUTE[t.route as ArmsRoute]?.label ?? t.route}
							</Badge>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="mt-3 text-sm text-fg-muted">No trades this week.</p>
			{/if}
		</section>
	</div>

	<!-- Licence desk -->
	{#if data.authority}
		<section class="panel mt-4 rounded-sm p-4">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="section-title flex items-center gap-1.5"><IconCertificate class="size-4" /> Export licence desk</h2>
				<span class="text-[11px] text-fg-faint">Foreign sales from {data.state?.name} wait for your decision</span>
			</div>
			{#if data.licenceQueue.length}
				<ul class="mt-3 grid gap-2 md:grid-cols-2">
					{#each data.licenceQueue as o (o.id)}
						{@const Icon = GOOD_ICON[o.good as ArmamentGood]}
						<li class="panel-muted flex min-w-0 flex-wrap items-center gap-3 rounded-sm p-3">
							<span
								class="grid size-9 shrink-0 place-items-center rounded-sm {CATEGORY_TINT[profile(o.good).category]}"
							>
								<Icon class="size-5" />
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold text-fg">
									{units(o.quantity)}
									{profile(o.good).label.toLowerCase()} → {o.targetName}
								</p>
								<p class="truncate text-[11px] text-fg-muted">
									{o.sellerName} · {money(o.pricePerUnit)}/unit · levy {data.rules.exportTax}% ≈
									{money((o.quantity * o.pricePerUnit * data.rules.exportTax) / 100)}
								</p>
							</div>
							<div class="flex gap-1.5">
								<form method="POST" action="?/approve" use:enhance={submit()}>
									<input type="hidden" name="listingId" value={o.id} />
									<Button type="submit" size="xs" variant="primary" icon={IconCheck}>Grant</Button>
								</form>
								<form method="POST" action="?/reject" use:enhance={submit()}>
									<input type="hidden" name="listingId" value={o.id} />
									<Button type="submit" size="xs" variant="ghost" icon={IconProhibited}>Refuse</Button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-fg-muted">No licence requests waiting.</p>
			{/if}
		</section>
	{/if}

	<!-- Own offers and shipments -->
	<div class="mt-4 grid gap-4 lg:grid-cols-2">
		<section class="panel min-w-0 rounded-sm p-4">
			<h2 class="section-title flex items-center gap-1.5"><IconTag class="size-4" /> Your offers</h2>
			{#if data.myOffers.length}
				<ul class="mt-3 space-y-2">
					{#each data.myOffers as o (o.id)}
						<li class="panel-muted flex min-w-0 items-center gap-3 rounded-sm px-3 py-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm text-fg">
									{units(o.quantity)}
									{profile(o.good).label.toLowerCase()} · <span class="data">{money(o.pricePerUnit)}</span>
								</p>
								<p class="truncate text-[11px] text-fg-faint">
									{o.targetName ? `for ${o.targetName}` : "own state & bloc"} · {GRADE_LABEL[
										conditionGrade(o.condition)
									]}
									({o.condition}%)
								</p>
							</div>
							{#if !o.licensed}
								<Badge tone="amber" size="xs" icon={IconClock}>Licence pending</Badge>
							{:else if o.exportLicence}
								<Badge tone="green" size="xs" icon={IconCertificate}>Licensed</Badge>
							{:else}
								<Badge tone="green" size="xs">Live</Badge>
							{/if}
							{#if !o.exportLicence || !o.licensed}
								<form method="POST" action="?/withdraw" use:enhance={submit()}>
									<input type="hidden" name="listingId" value={o.id} />
									<Button type="submit" size="xs" variant="ghost" icon={IconUndo} aria-label="Withdraw offer">
										Withdraw
									</Button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-fg-muted">You have nothing on offer. Pick a card and choose Sell.</p>
			{/if}
		</section>

		<section class="panel min-w-0 rounded-sm p-4">
			<h2 class="section-title flex items-center gap-1.5"><IconTruck class="size-4" /> Deliveries</h2>
			{#if data.deliveries.length}
				<ul class="mt-3 space-y-2.5">
					{#each data.deliveries as d (d.id)}
						{@const done = !!d.deliveredAt || progress(d.createdAt, d.arrivesAt) >= 1}
						<li class="min-w-0">
							<div class="flex min-w-0 items-baseline gap-2">
								<p class="min-w-0 flex-1 truncate text-sm text-fg">
									{units(d.quantity)}
									{profile(d.good).label.toLowerCase()}
									<span class="text-[11px] text-fg-faint">from {d.from} · {d.sellerName}</span>
								</p>
								<span class="data shrink-0 text-[11px] {done ? 'text-positive-fg' : 'text-fg-muted'}">
									{d.deliveredAt ? "delivered" : eta(d.arrivesAt)}
								</span>
							</div>
							<div class="mt-1 flex items-center gap-2">
								<span class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-7">
									<span
										class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 {done
											? 'bg-positive'
											: 'bg-friendly'}"
										style:width="{(d.deliveredAt ? 1 : progress(d.createdAt, d.arrivesAt)) * 100}%"
									></span>
								</span>
								<Badge tone={ROUTE[d.route as ArmsRoute]?.tone ?? "neutral"} size="xs">
									{ROUTE[d.route as ArmsRoute]?.label ?? d.route}
								</Badge>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-fg-muted">No shipments on the way.</p>
			{/if}
		</section>
	</div>

	<p class="mt-4 flex items-start gap-2 text-[11px] text-fg-faint">
		<IconInfo class="mt-px size-4 shrink-0" />
		<span>
			Own-state sales ship in {data.rules.deliveryHours.domestic} h, bloc sales in {data.rules.deliveryHours.bloc} h and foreign
			sales in {data.rules.deliveryHours.foreign} h (plus an hour per tenfold in size). Foreign sales need an export licence
			and pay a {data.rules.exportTax}% levy from the proceeds. Hardware loses {data.rules.wear} condition points each time
			it changes hands.
		</span>
	</p>
</PageContainer>

<!-- Detail drawer -->
<dialog
	bind:this={dialog}
	class="arms-drawer bg-surface-2 text-fg"
	aria-labelledby="arms-drawer-title"
	onclose={() => (drawerGood = null)}
	onclick={(e) => e.target === dialog && closeDrawer()}
>
	{#if drawer}
		{@const p = profile(drawer.good)}
		{@const Icon = GOOD_ICON[drawer.good as ArmamentGood]}
		<div class="flex h-full flex-col">
			<header class="flex items-start gap-3 border-b border-line/15 p-4">
				<span class="grid size-12 shrink-0 place-items-center rounded-sm {CATEGORY_TINT[p.category]}">
					<Icon class="size-7" />
				</span>
				<div class="min-w-0 flex-1">
					<h2 id="arms-drawer-title" class="font-serif text-xl font-bold text-fg">{p.label}</h2>
					<p class="text-xs text-fg-muted">{p.blurb}</p>
				</div>
				<button
					type="button"
					class="rounded-sm p-1 text-fg-muted hover:bg-surface-5 hover:text-fg"
					onclick={closeDrawer}
					aria-label="Close"
				>
					<IconDismiss class="size-5" />
				</button>
			</header>

			<div class="flex-1 space-y-4 overflow-y-auto p-4">
				<!-- Market snapshot -->
				<div class="flex items-center gap-3">
					<OddsRing
						value={drawer.demand + drawer.supply ? drawer.demand / (drawer.demand + drawer.supply) : 0.5}
						size={56}
						label="Demand share of the market"
					/>
					<div class="grid min-w-0 flex-1 grid-cols-3 gap-2 text-[11px]">
						<div>
							<p class="text-fg-faint">Guide</p>
							<p class="data text-sm text-fg">{money(drawer.guide)}</p>
						</div>
						<div>
							<p class="text-fg-faint">Last trade</p>
							<p class="data text-sm text-fg">{drawer.lastPrice ? money(drawer.lastPrice) : "—"}</p>
						</div>
						<div>
							<p class="text-fg-faint">Reference</p>
							<p class="data text-sm text-fg">{money(drawer.value)}</p>
						</div>
					</div>
				</div>
				<p class="text-[11px] text-fg-faint">
					The ring shows demand against supply: {units(drawer.demand)} traded this week vs {units(drawer.supply)} on offer.
					Busy, scarce hardware pushes the guide price up.
				</p>

				<!-- Comparison -->
				<section>
					<div class="flex items-center justify-between gap-2">
						<h3 class="section-title flex items-center gap-1.5"><IconScales class="size-4" /> Compare</h3>
						<select
							bind:value={compareGood}
							class="field-control rounded-sm px-2 py-1 text-xs"
							aria-label="Compare with"
						>
							<option value="">Pick hardware…</option>
							{#each data.goods.filter((g) => g.good !== drawer.good) as g (g.good)}
								<option value={g.good}>{profile(g.good).label}</option>
							{/each}
						</select>
					</div>
					<dl class="mt-2 space-y-1.5">
						{#each Object.entries(p.stats) as [key, value] (key)}
							{@const other = compare ? profile(compare.good).stats[key as keyof ArmamentStats] : null}
							<div class="grid grid-cols-[5.5rem_1fr] items-center gap-2">
								<dt class="text-[11px] text-fg-muted">{STAT_LABEL[key as keyof ArmamentStats]}</dt>
								<dd class="space-y-0.5">
									<span class="flex items-center gap-1.5">
										<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-7">
											<span class="block h-full rounded-full bg-primary" style:width="{value * 10}%"></span>
										</span>
										<span class="data w-4 text-right text-[10px] text-fg">{value}</span>
									</span>
									{#if other !== null}
										<span class="flex items-center gap-1.5">
											<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-7">
												<span class="block h-full rounded-full bg-friendly" style:width="{other * 10}%"></span>
											</span>
											<span class="data w-4 text-right text-[10px] text-fg-muted">{other}</span>
										</span>
									{/if}
								</dd>
							</div>
						{/each}
						{#if compare}
							<div class="grid grid-cols-[5.5rem_1fr] items-center gap-2 pt-1 text-[11px]">
								<dt class="text-fg-muted">Guide price</dt>
								<dd class="flex flex-wrap gap-x-3">
									<span class="data text-primary-fg">{money(drawer.guide)}</span>
									<span class="data text-friendly-fg">{money(compare.guide)}</span>
									<span class="text-fg-faint">({(drawer.guide / compare.guide).toFixed(1)}×)</span>
								</dd>
							</div>
							<p class="flex gap-3 text-[10px] text-fg-faint">
								<span class="inline-flex items-center gap-1">
									<span class="size-2 rounded-full bg-primary"></span>{p.label}
								</span>
								<span class="inline-flex items-center gap-1">
									<span class="size-2 rounded-full bg-friendly"></span>{profile(compare.good).label}
								</span>
							</p>
						{/if}
					</dl>
				</section>

				<!-- Trade form -->
				<section class="rounded-sm border border-line/15">
					<div class="grid grid-cols-2 border-b border-line/15" role="tablist" aria-label="Trade">
						{#each [{ id: "buy", label: "Buy", icon: IconCart }, { id: "sell", label: "Sell", icon: IconTag }] as t (t.id)}
							<button
								type="button"
								role="tab"
								aria-selected={tab === t.id}
								class="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors {tab ===
								t.id
									? 'bg-surface-4 text-fg'
									: 'text-fg-muted hover:text-fg'}"
								onclick={() => (tab = t.id as typeof tab)}
							>
								<t.icon class="size-4" />
								{t.label}
							</button>
						{/each}
					</div>

					{#if tab === "buy"}
						<div class="space-y-3 p-3">
							{#if offersOf(drawer.good).length}
								<fieldset class="min-w-0 space-y-1.5">
									<legend class="field-label">Offer</legend>
									{#each offersOf(drawer.good) as o (o.id)}
										<label
											class="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-sm border px-2.5 py-2 transition-colors {pickedId ===
											o.id
												? 'border-primary/50 bg-primary/10'
												: 'border-line/15 hover:bg-surface-3'}"
										>
											<input type="radio" name="offer-pick" value={o.id} bind:group={pickedId} class="sr-only" />
											<OddsRing
												value={o.condition / 100}
												size={30}
												color={conditionTone(o.condition)}
												label="Condition"
												textClass="text-[9px]"
											/>
											<span class="min-w-0 flex-1">
												<span class="block truncate text-xs text-fg">
													<span class="data">{money(o.pricePerUnit)}</span> · {units(o.quantity)} avail. · {o.sellerName}
												</span>
												<span class="block truncate text-[10px] {o.blocker ? 'text-hostile-fg' : 'text-fg-faint'}">
													{o.blocker ?? `${o.sellerStateName} · ships in ~${deliveryHours(o.route, buyQty)} h`}
												</span>
											</span>
											<Badge tone={ROUTE[o.route].tone} size="xs">{ROUTE[o.route].label}</Badge>
										</label>
									{/each}
								</fieldset>
								{#if picked}
									<form method="POST" action="?/buy" use:enhance={submit(closeDrawer)} class="space-y-3">
										<input type="hidden" name="listingId" value={picked.id} />
										<label class="block">
											<span class="field-label">Quantity</span>
											<div class="flex items-center gap-2">
												<input
													type="range"
													min="1"
													max={picked.quantity}
													bind:value={buyQty}
													class="min-w-0 flex-1 accent-(--color-primary)"
													aria-label="Quantity slider"
												/>
												<input
													type="number"
													name="quantity"
													min="1"
													max={picked.quantity}
													bind:value={buyQty}
													class="field-control w-24 rounded-sm px-2 py-1.5 text-sm"
													required
												/>
											</div>
										</label>
										<dl class="grid grid-cols-3 gap-2 rounded-sm bg-surface-3 p-2 text-[11px]">
											<div>
												<dt class="text-fg-faint">Total</dt>
												<dd class="data text-sm {buyTotal > data.wallet ? 'text-hostile-fg' : 'text-fg'}">
													{money(buyTotal)}
												</dd>
											</div>
											<div>
												<dt class="text-fg-faint">Arrives in</dt>
												<dd class="data text-sm text-fg">~{deliveryHours(picked.route, buyQty)} h</dd>
											</div>
											<div>
												<dt class="text-fg-faint">Condition</dt>
												<dd class="data text-sm text-fg">{picked.condition}%</dd>
											</div>
										</dl>
										{#if buyBlock}
											<p class="flex items-start gap-1.5 text-xs text-hostile-fg">
												<IconProhibited class="mt-px size-4 shrink-0" />{buyBlock}
											</p>
										{/if}
										<Button type="submit" block disabled={!!buyBlock} icon={IconCart}>Buy for {money(buyTotal)}</Button>
									</form>
								{/if}
							{:else}
								<p class="text-sm text-fg-muted">Nobody is offering {p.label.toLowerCase()} right now.</p>
							{/if}
						</div>
					{:else}
						<form method="POST" action="?/list" use:enhance={submit(closeDrawer)} class="space-y-3 p-3">
							<input type="hidden" name="good" value={drawer.good} />
							<input type="hidden" name="grade" value={grade} />
							<div>
								<span class="field-label">Stock</span>
								<div class="grid grid-cols-2 gap-2">
									{#each [{ id: "new", label: "New", n: drawer.fresh, c: 100 }, { id: "used", label: "Second-hand", n: drawer.used, c: drawer.usedCondition }] as s (s.id)}
										<button
											type="button"
											class="flex items-center gap-2 rounded-sm border px-2.5 py-2 text-left transition-colors {grade ===
											s.id
												? 'border-primary/50 bg-primary/10'
												: 'border-line/15 hover:bg-surface-3'}"
											aria-pressed={grade === s.id}
											onclick={() => {
												grade = s.id as typeof grade;
												price = grade === "new" ? drawer.guide : drawer.usedGuide;
											}}
										>
											<OddsRing
												value={s.c / 100}
												size={28}
												color={conditionTone(s.c)}
												label="Condition"
												textClass="text-[9px]"
											/>
											<span class="min-w-0">
												<span class="block text-xs font-semibold text-fg">{s.label}</span>
												<span class="block text-[10px] text-fg-faint">{units(s.n)} held</span>
											</span>
										</button>
									{/each}
								</div>
							</div>
							<div class="grid grid-cols-2 gap-2">
								<label class="block min-w-0">
									<span class="field-label">Quantity</span>
									<input
										type="number"
										name="quantity"
										min="1"
										max={Math.max(1, sellAvail)}
										bind:value={sellQty}
										class="field-control w-full rounded-sm px-2 py-1.5 text-sm"
										required
									/>
								</label>
								<label class="block min-w-0">
									<span class="field-label flex justify-between">
										<span>Price each</span>
										<button
											type="button"
											class="text-[10px] text-primary-fg hover:underline"
											onclick={() => (price = sellGuide)}
										>
											guide {money(sellGuide)}
										</button>
									</span>
									<input
										type="number"
										name="pricePerUnit"
										min={sellBand.min}
										max={sellBand.max}
										bind:value={price}
										class="field-control w-full rounded-sm px-2 py-1.5 text-sm"
										required
									/>
								</label>
							</div>
							<p class="text-[10px] text-fg-faint">
								Allowed {money(sellBand.min)}–{money(sellBand.max)} for {GRADE_LABEL[
									conditionGrade(sellCondition)
								].toLowerCase()} stock ({sellCondition}%).
							</p>
							<div>
								<span class="field-label">Buyer</span>
								<div class="grid grid-cols-2 gap-2">
									<button
										type="button"
										class="flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs transition-colors {buyerMode ===
										'open'
											? 'border-primary/50 bg-primary/10 text-fg'
											: 'border-line/15 text-fg-muted'}"
										aria-pressed={buyerMode === "open"}
										onclick={() => (buyerMode = "open")}
									>
										<IconGov class="size-4" /> Own state &amp; bloc
									</button>
									<button
										type="button"
										class="flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs transition-colors {buyerMode ===
										'state'
											? 'border-primary/50 bg-primary/10 text-fg'
											: 'border-line/15 text-fg-muted'}"
										aria-pressed={buyerMode === "state"}
										onclick={() => (buyerMode = "state")}
									>
										<IconGlobe class="size-4" /> One state
									</button>
								</div>
								{#if buyerMode === "state"}
									<div class="mt-2">
										<SearchSelect
											items={stateItems}
											bind:value={targetId}
											name="targetStateId"
											showId
											placeholder="Choose the buying state…"
											searchPlaceholder="Search states…"
										/>
									</div>
								{/if}
							</div>
							<dl class="grid grid-cols-3 gap-2 rounded-sm bg-surface-3 p-2 text-[11px]">
								<div>
									<dt class="text-fg-faint">Route</dt>
									<dd class="text-sm text-fg">{ROUTE[sellRoute].label}</dd>
								</div>
								<div>
									<dt class="text-fg-faint">Levy</dt>
									<dd class="data text-sm text-fg">{sellLevy}%</dd>
								</div>
								<div>
									<dt class="text-fg-faint">You receive</dt>
									<dd class="data text-sm text-positive-fg">{money(proceeds)}</dd>
								</div>
							</dl>
							{#if sellRoute === "foreign"}
								<p class="flex items-start gap-1.5 text-[11px] text-warning">
									<IconCertificate class="mt-px size-4 shrink-0" />
									Needs an export licence from your defence minister or president before it goes live. Once licensed it can't
									be withdrawn.
								</p>
							{/if}
							{#if sellBlock}
								<p class="flex items-start gap-1.5 text-xs text-hostile-fg">
									<IconProhibited class="mt-px size-4 shrink-0" />{sellBlock}
								</p>
							{/if}
							<Button
								type="submit"
								block
								disabled={!!sellBlock}
								icon={sellRoute === "foreign" ? IconCertificate : IconArrowRight}
							>
								{sellRoute === "foreign" ? "Request licence & list" : "Publish offer"}
							</Button>
						</form>
					{/if}
				</section>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.arms-hero {
		background-image:
			radial-gradient(
				120% 140% at 100% 0%,
				color-mix(in oklab, var(--color-primary) 14%, transparent),
				transparent 60%
			),
			repeating-linear-gradient(
				135deg,
				color-mix(in oklab, var(--color-fg) 3%, transparent) 0 1px,
				transparent 1px 14px
			);
	}
	.hatch {
		background: repeating-linear-gradient(45deg, var(--color-fg-faint) 0 1.5px, transparent 1.5px 4px);
	}
	.arms-drawer {
		margin: 0 0 0 auto;
		width: min(30rem, 100vw);
		max-width: 100vw;
		height: 100dvh;
		max-height: 100dvh;
		padding: 0;
		border-left: 1px solid color-mix(in oklab, var(--color-line) 25%, transparent);
	}
	.arms-drawer[open] {
		animation: drawer-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.arms-drawer::backdrop {
		background: rgb(0 0 0 / 0.5);
		backdrop-filter: blur(2px);
	}
	@keyframes drawer-in {
		from {
			transform: translateX(100%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.arms-drawer[open] {
			animation: none;
		}
	}
</style>
