<!-- src/routes/(authenticated)/(dock)/state/[id]/debt/+page.svelte -->
<!-- Debt in context: the treasury's bill, an estimated GDP, and the lenders
     who bought the bonds behind the debt. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import { INVESTMENTS_CONFIG } from "#lib/config/index.js";
	import { formatDate } from "#lib/utils/formatting.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import IntelValue from "#lib/component/intel/IntelValue.svelte";
	import IntelNote from "#lib/component/intel/IntelNote.svelte";
	import type { Estimate } from "#lib/utils/intel-estimate.js";

	let { data } = $props();
</script>

<!-- A headline figure: as before when exact, an estimate with its interval otherwise. -->
{#snippet big(e: Estimate, tone: string, unit = "")}
	{#if e.kind === "exact"}
		<p class="mt-1 font-mono text-2xl font-bold {tone}">{e.value.toLocaleString()}{unit}</p>
	{:else}
		<IntelValue estimate={e} {unit} variant="block" class="mt-1" />
	{/if}
{/snippet}

<svelte:head>
	<title>Debt · {data.state.name} · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="State debt"
		subtitle={data.state.name}
		icon={FluentMoney20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	{#if !data.intel.exact}
		<IntelNote stateId={data.state.id} group="economy" level={data.intel.level} class="mb-4" />
	{/if}

	<div class="grid gap-4 sm:grid-cols-3">
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Outstanding debt</p>
			{@render big(data.debt, "text-amber-300")}
		</div>
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">GDP (est.)</p>
			{@render big(data.gdp.gdp, "text-fg")}
		</div>
		<div class="panel rounded-sm p-4 sm:p-5">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Debt / GDP</p>
			{#if data.gdp.debtToGdp == null}
				<p class="mt-1 font-mono text-2xl font-bold text-fg">—</p>
			{:else}
				{@render big(data.gdp.debtToGdp, "text-fg", "%")}
			{/if}
		</div>
	</div>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="section-title">Credit rating</h2>
			<p class="text-sm text-fg-body">
				New bonds from this state pay <strong class="font-mono text-fg">{data.risk.ratePercent}%</strong>
				a year · grade <strong class="font-mono text-fg">{data.risk.grade}</strong> ({data.risk.label}, risk {data.risk
					.score}/100)
			</p>
		</div>
		<div class="rounded-sm border border-line/20">
			{#each data.risk.components as component (component.key)}
				<div class="flex items-center justify-between gap-3 border-b border-line/10 px-3 py-2 text-sm last:border-0">
					<span>
						<strong class="font-medium text-fg">{component.label}</strong><span class="block text-xs text-fg-muted">
							{component.detail}
						</span>
					</span>
					<span class="font-mono {component.points < 0 ? 'text-positive-fg' : 'text-amber-300'}">
						{component.points > 0 ? "+" : ""}{component.points}
					</span>
				</div>
			{/each}
		</div>
		<p class="text-xs text-fg-muted">
			The coupon is fixed when an investor buys a bond; a later change in this rating does not alter bonds already sold.
		</p>
	</section>

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<h2 class="section-title">How GDP is estimated</h2>
		<p class="text-sm text-fg-body">
			A year of tax receipts is grossed up by the average tax rate to estimate the taxable base, then household
			consumption is added. Debt/GDP is the outstanding treasury debt as a share of that total.
		</p>
		<div class="rounded-sm border border-line/20">
			<div
				class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line/20 bg-surface-2/50 px-3 py-2 text-[10px] uppercase tracking-wide text-fg-muted"
			>
				<span>Factor</span><span class="text-right">Basis</span><span class="text-right">Credits</span>
			</div>
			<div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm">
				<span>Tax receipts (12 months)</span>
				<span class="text-right font-mono text-xs text-fg-muted">
					average rate {(data.gdp.taxRate * 100).toFixed(1)}%
				</span>
				<IntelValue estimate={data.gdp.taxesAnnual} wrap class="justify-end text-right text-fg" />
			</div>
			<div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm">
				<span>Taxable base</span>
				<span class="text-right font-mono text-xs text-fg-muted">receipts ÷ rate</span>
				<IntelValue estimate={data.gdp.taxesBasis} wrap class="justify-end text-right text-fg" />
			</div>
			<div class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-b border-line/10 px-3 py-2 text-sm">
				<span>Household consumption</span>
				<span class="flex items-center justify-end gap-1 text-right font-mono text-xs text-fg-muted">
					<IntelValue estimate={data.gdp.population} /> civilians
				</span>
				<IntelValue estimate={data.gdp.consumption} wrap class="justify-end text-right text-fg" />
			</div>
			<div class="flex justify-between bg-primary/10 px-3 py-2 text-sm font-semibold text-fg">
				<span>Estimated GDP</span><IntelValue estimate={data.gdp.gdp} />
			</div>
		</div>
	</section>

	{#if data.canIssueBonds}
		<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
			<h2 class="section-title">Hand out bonds</h2>
			<p class="text-sm text-fg-body">
				As this state's president or economy minister you decide how much it borrows. Investors buy slices of the
				offering on the bond market; each bond is recorded as handed out by you.
			</p>
			<form
				method="POST"
				action="?/issueBonds"
				class="flex flex-wrap items-end gap-2"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						toastResult(result);
					};
				}}
			>
				<label class="block flex-1 min-w-48">
					<span class="field-label">Amount to borrow</span>
					<input
						type="number"
						name="principal"
						class="field-control rounded-sm px-3 py-2 w-full font-mono"
						min={INVESTMENTS_CONFIG.BOND_MIN_PRINCIPAL}
						step="100"
						value={INVESTMENTS_CONFIG.BOND_MIN_PRINCIPAL}
						required
					/>
				</label>
				<Button type="submit" variant="secondary" size="sm">Open offering</Button>
			</form>
		</section>
	{/if}

	{#if data.bondOfferings.length}
		<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-2">
			<h2 class="section-title">Open offerings</h2>
			{#each data.bondOfferings as offering (offering.id)}
				<div class="flex flex-wrap justify-between gap-2 border-b border-line/10 py-1 text-sm last:border-0">
					<span class="text-fg-muted">
						{offering.principal.toLocaleString()} opened {formatDate(offering.createdAt)}
						{offering.issuerName ? `by ${offering.issuerName}` : ""}
					</span>
					<span class="font-mono text-fg">{offering.remaining.toLocaleString()} left</span>
				</div>
			{/each}
		</section>
	{/if}

	<section class="panel rounded-sm p-4 sm:p-5 mt-4 space-y-3">
		<h2 class="section-title">Who holds the debt</h2>
		{#if !data.creditors}
			<p class="text-sm text-fg-body">
				The lender book stays with {data.state.name}'s treasury. Bonds out in total:
				<IntelValue estimate={data.lenderTotal} class="text-fg" />
			</p>
		{:else if data.creditors.creditors.length}
			<ul class="divide-y divide-line/10">
				{#each data.creditors.creditors as creditor (creditor.userId)}
					<li class="py-2">
						<div class="flex items-center justify-between gap-3 text-sm">
							<UserLink id={creditor.userId} name={creditor.name} size="xs" />
							<span class="shrink-0 font-mono font-semibold text-amber-300">{creditor.principal.toLocaleString()}</span>
						</div>
						<p class="mt-0.5 text-xs text-fg-muted">
							{creditor.bonds} bond{creditor.bonds === 1 ? "" : "s"} · first {formatDate(creditor.firstAt)} · matures {formatDate(
								creditor.maturesAt
							)}
						</p>
					</li>
				{/each}
			</ul>
			<div class="flex justify-between border-t border-line/15 pt-3 text-sm font-semibold">
				<span>Total from lenders</span><span class="font-mono">{data.creditors.total.toLocaleString()}</span>
			</div>
		{:else}
			<EmptyState title="No outstanding bonds" subtitle="This state's treasury owes nobody right now." />
		{/if}
	</section>
</PageContainer>
