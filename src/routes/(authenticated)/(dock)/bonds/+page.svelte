<!-- src/routes/(authenticated)/(dock)/bonds/+page.svelte -->
<!-- The lending desk: treasury bonds as certificates, with their coupons,
     next payment date and the running interest already earned. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { confirmSubmit } from "#lib/ui/confirm-submit.js";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { dtgDate } from "#lib/utils/dtg.js";

	let { data, form } = $props();
	const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
	let buying = $state(false);

	const statusTone = { active: "green", matured: "blue", redeemed: "neutral" } as const;
</script>

<svelte:head>
	<title>State Bonds · PsyOps</title>
</svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader title="State bonds" subtitle="Lend to a treasury. Earn a coupon every two weeks.">
		{#snippet actions()}
			<span class="panel-muted rounded-sm px-3 py-2 font-mono text-xs text-fg-soft">
				Wallet <span class="text-positive-fg">{money(data.walletBalance)}</span>
			</span>
		{/snippet}
	</PageHeader>

	<div class="grid gap-2 sm:grid-cols-3">
		<div class="panel rounded-sm p-3">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Outstanding loans</p>
			<p class="font-mono text-lg font-bold text-fg">{money(data.invested)}</p>
		</div>
		<div class="panel rounded-sm p-3">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Interest received</p>
			<p class="font-mono text-lg font-bold text-positive-fg">{money(data.interest)}</p>
		</div>
		<div class="panel rounded-sm p-3">
			<p class="text-[10px] uppercase tracking-wide text-fg-muted">Coupon rate</p>
			<p class="font-mono text-lg font-bold text-fg">{data.config.BOND_COUPON_PERCENT}% / year</p>
		</div>
	</div>

	<section class="panel rounded-sm p-4">
		<h2 class="section-title mb-3">Buy a bond</h2>
		{#if form?.error}
			<p class="field-error mb-3">{form.error}</p>
		{/if}
		<form
			method="POST"
			action="?/buy"
			use:enhance={() => {
				buying = true;
				return async ({ update, result }) => {
					await update();
					buying = false;
					toastResult(result);
				};
			}}
			class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] items-end"
		>
			<label class="block">
				<span class="field-label">Borrower</span>
				<select name="stateId" class="field-control rounded-sm px-3 py-2.5 w-full" required>
					{#each data.states as state (state.id)}
						<option value={state.id}>{state.name}</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="field-label">Principal</span>
				<input
					type="number"
					name="principal"
					class="field-control rounded-sm px-3 py-2.5 w-full"
					min={data.config.BOND_MIN_PRINCIPAL}
					step="100"
					value={data.config.BOND_MIN_PRINCIPAL}
					required
				/>
			</label>
			<Button type="submit" variant="primary" loading={buying} loadingText="Issuing…">Issue bond</Button>
		</form>
		<p class="field-hint">
			Minimum {money(data.config.BOND_MIN_PRINCIPAL)} · {data.config.BOND_TERM_DAYS}-day term ·
			{data.config.COUPON_PERIOD_DAYS}-day coupons · principal repaid at maturity.
		</p>
	</section>

	<section>
		<h2 class="section-title mb-2 px-1">Your certificates ({data.bonds.length})</h2>
		{#if !data.bonds.length}
			<EmptyState title="No bonds yet" subtitle="Buy a bond above to start earning coupons." />
		{:else}
			<ul class="space-y-2">
				{#each data.bonds as bond (bond.id)}
					<li class="paper rounded-sm p-4 relative overflow-hidden">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="font-mono text-[10px] uppercase tracking-[0.2em]">
									State bond no. {String(bond.id).padStart(5, "0")}
								</p>
								<p class="mt-1 font-semibold text-lg">Loan to the state</p>
								<p class="text-xs opacity-70">
									Issued {dtgDate(bond.purchasedAt)} · matures {dtgDate(bond.maturesAt)}
								</p>
							</div>
							<div class="text-right">
								<p class="font-mono text-xl font-bold">{money(bond.principal)}</p>
								<p class="font-mono text-xs">{bond.couponRatePercent}% annual coupon</p>
							</div>
						</div>
						<div class="mt-3 pt-3 border-t border-ink/20 grid gap-2 sm:grid-cols-3 text-xs">
							<p>Interest earned <span class="font-mono font-bold">{money(bond.earned)}</span></p>
							<p>Next coupon <span class="font-mono">{bond.nextCouponAt ? dtgDate(bond.nextCouponAt) : "—"}</span></p>
							<p class="sm:text-right">
								{#if bond.status === "active"}
									<form
										method="POST"
										action="?/redeem"
										use:confirmSubmit={{
											title: "Cash in this bond?",
											body: "Early redemption returns the principal but forfeits future coupons."
										}}
									>
										<input type="hidden" name="bondId" value={bond.id} />
										<Button type="submit" variant="secondary" size="sm">Redeem early</Button>
									</form>
								{:else}
									<span class="font-mono uppercase tracking-wide">{bond.status}</span>
								{/if}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</PageContainer>
