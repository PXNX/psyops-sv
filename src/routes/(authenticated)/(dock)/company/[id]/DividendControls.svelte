<!-- src/routes/(authenticated)/(dock)/company/[id]/DividendControls.svelte -->
<!-- Owner controls of the Dividends panel: declare a dividend (with a live
     preview of the cost and who gets what) and the automatic payout policy. -->
<script lang="ts">
	import { tick } from "svelte";
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { declareDividendSchema, dividendPolicySchema } from "./schema.js";
	import { celebrate } from "#lib/utils/celebrate.js";
	import { toast } from "#lib/ui/toast.svelte.js";
	import { Button } from "#lib/component/ui/index.js";
	import FluentCoinMultiple20Filled from "~icons/fluent/coin-multiple-20-filled";

	let {
		declareForm,
		policyForm,
		heldShares,
		holderCount,
		myShares,
		sharePrice,
		cooldownEndsAt,
		budgetBalance,
		config,
		onPaid
	}: {
		declareForm: SuperValidated<{ perShare: number }>;
		policyForm: SuperValidated<{ ratioPercent: number; reserve: number }>;
		heldShares: number;
		holderCount: number;
		myShares: number;
		sharePrice: number | null;
		cooldownEndsAt: string | null;
		budgetBalance: number;
		config: { cooldownHours: number; minPerShare: number; minTotal: number };
		/** Called after a successful payout with the previewed total as a fallback amount. */
		onPaid: (previewTotal: number) => void;
	} = $props();

	const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

	/** Failures toast (successes show themselves in the panel). */
	function toastFailure(result: { type: string; data?: Record<string, any> }) {
		if (result.type === "failure") toast.error(result.data?.form?.message ?? "That didn't work. Please try again.");
		else if (result.type === "error") toast.error("Something went wrong on our side. Please try again.");
	}

	// ---- Declare ----
	const {
		form: declareData,
		errors: declareErrors,
		submitting: declaring,
		enhance: declareEnhance
	} = superForm(declareForm, {
		id: "dividend",
		validators: valibotClient(declareDividendSchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		resetForm: false,
		onResult: ({ result }) => toastFailure(result),
		onUpdated: async ({ form }) => {
			if (!form.valid) return;
			await tick();
			onPaid(previewTotal);
		}
	});

	const perShare = $derived(Math.max(0, Math.floor(Number($declareData.perShare) || 0)));
	const previewTotal = $derived(perShare * heldShares);
	const previewAverage = $derived(holderCount > 0 ? previewTotal / holderCount : 0);
	const previewMine = $derived(perShare * myShares);
	const previewYield = $derived(sharePrice ? Math.round((perShare / sharePrice) * 1000) / 10 : null);
	const maxPerShare = $derived(heldShares > 0 ? Math.floor(budgetBalance / heldShares) : 0);

	// Cooldown countdown.
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(id);
	});
	const cooldownLeft = $derived(cooldownEndsAt ? Math.max(0, new Date(cooldownEndsAt).getTime() - now) : 0);
	const cooldownText = $derived.by(() => {
		const minutes = Math.ceil(cooldownLeft / 60_000);
		const h = Math.floor(minutes / 60);
		return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`;
	});

	const blockReason = $derived(
		cooldownLeft > 0
			? `Next dividend in ${cooldownText}`
			: perShare < config.minPerShare
				? `At least ${money(config.minPerShare)} per share`
				: previewTotal < config.minTotal
					? `At least ${money(config.minTotal)} in total`
					: previewTotal > budgetBalance
						? "More than the company budget holds"
						: null
	);

	// ---- Automatic policy ----
	let policyEl = $state<HTMLElement | null>(null);
	const {
		form: policyData,
		errors: policyErrors,
		submitting: savingPolicy,
		enhance: policyEnhance
	} = superForm(policyForm, {
		id: "dividendPolicy",
		validators: valibotClient(dividendPolicySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		resetForm: false,
		onResult: ({ result }) => toastFailure(result),
		onUpdated: async ({ form }) => {
			if (!form.valid) return;
			await tick();
			celebrate(policyEl);
		}
	});

	const policyRatio = $derived(Math.min(100, Math.max(0, Number($policyData.ratioPercent) || 0)));
	const policyReserve = $derived(Math.max(0, Number($policyData.reserve) || 0));
	const policyPool = $derived(Math.floor((Math.max(0, budgetBalance - policyReserve) * policyRatio) / 100));
	const policyPerShare = $derived(heldShares > 0 ? Math.floor(policyPool / heldShares) : 0);
	const policyWouldPay = $derived(
		policyPerShare >= config.minPerShare && policyPerShare * heldShares >= config.minTotal
	);
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<form method="POST" action="?/declareDividend" class="panel-muted rounded-sm p-3 space-y-3" use:declareEnhance>
		<div>
			<label class="field-label flex justify-between" for="perShare">
				<span>Dividend per share</span>
				<span class="data text-fg-muted text-xs">max {money(maxPerShare)}</span>
			</label>
			<input
				id="perShare"
				type="number"
				name="perShare"
				min={config.minPerShare}
				step="1"
				bind:value={$declareData.perShare}
				class="field-control rounded-sm px-3 py-2 w-full font-mono"
				aria-invalid={$declareErrors.perShare ? "true" : undefined}
				required
			/>
			{#if $declareErrors.perShare}<p class="field-error">{$declareErrors.perShare}</p>{/if}
		</div>

		<dl class="data text-xs space-y-1">
			<div class="flex justify-between gap-2">
				<dt class="font-sans text-fg-muted">Total from budget</dt>
				<dd class={previewTotal > budgetBalance ? "text-red-300" : "text-fg"}>{money(previewTotal)}</dd>
			</div>
			<div class="flex justify-between gap-2">
				<dt class="font-sans text-fg-muted">Per holder (avg of {holderCount})</dt>
				<dd class="text-fg-body">{money(previewAverage)}</dd>
			</div>
			<div class="flex justify-between gap-2">
				<dt class="font-sans text-fg-muted">Your {myShares.toLocaleString()} shares</dt>
				<dd class="text-positive-fg">{money(previewMine)}</dd>
			</div>
			{#if previewYield !== null}
				<div class="flex justify-between gap-2">
					<dt class="font-sans text-fg-muted">Yield at {money(sharePrice ?? 0)}/share</dt>
					<dd class="text-fg-body">{previewYield}%</dd>
				</div>
			{/if}
			<div class="flex justify-between gap-2 border-t border-dashed border-line/20 pt-1">
				<dt class="font-sans text-fg-muted">Budget after</dt>
				<dd class="text-fg">{money(Math.max(0, budgetBalance - previewTotal))}</dd>
			</div>
		</dl>

		<Button
			type="submit"
			variant="soft-emerald"
			icon={FluentCoinMultiple20Filled}
			loading={$declaring}
			loadingText="Paying…"
			disabled={!!blockReason}
			class="w-full"
		>
			Pay dividend
		</Button>
		{#if blockReason}<p class="field-hint">{blockReason}</p>{/if}
	</form>

	<form
		method="POST"
		action="?/setDividendPolicy"
		class="panel-muted rounded-sm p-3 space-y-3"
		bind:this={policyEl}
		use:policyEnhance
	>
		<div>
			<label class="field-label flex justify-between" for="ratioPercent">
				<span>Automatic payout</span>
				<span class="data text-fg">{policyRatio === 0 ? "off" : `${policyRatio}%`}</span>
			</label>
			<input
				id="ratioPercent"
				type="range"
				name="ratioPercent"
				min="0"
				max="100"
				step="5"
				bind:value={$policyData.ratioPercent}
				class="w-full accent-primary"
			/>
			{#if $policyErrors.ratioPercent}<p class="field-error">{$policyErrors.ratioPercent}</p>{/if}
		</div>
		<div>
			<label class="field-label" for="reserve">Keep in reserve</label>
			<input
				id="reserve"
				type="number"
				name="reserve"
				min="0"
				step="1"
				bind:value={$policyData.reserve}
				class="field-control rounded-sm px-3 py-2 w-full font-mono"
				required
			/>
			{#if $policyErrors.reserve}<p class="field-error">{$policyErrors.reserve}</p>{/if}
		</div>
		<p class="field-hint">
			{#if policyRatio === 0}
				Dividends are only paid when you declare them.
			{:else}
				At most every {config.cooldownHours}h: {policyRatio}% of the budget above the reserve.
				{#if policyWouldPay}
					Today that's <span class="data text-positive-fg">{money(policyPerShare)}</span> per share.
				{:else}
					Right now that's too little to pay out.
				{/if}
			{/if}
		</p>
		<Button type="submit" variant="secondary" loading={$savingPolicy} class="w-full">Save policy</Button>
	</form>
</div>
