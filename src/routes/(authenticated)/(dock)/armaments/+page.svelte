<!-- src/routes/(authenticated)/(dock)/armaments/+page.svelte -->
<!-- A separate market for military hardware. Sales beyond the bloc wait for
     the seller's defence minister to sign off. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Badge, Button } from "#lib/component/ui/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";

	let { data, form } = $props();
	const submit = () => async ({ result, update }: { result: unknown; update: () => Promise<void> }) => {
		await update();
		toastResult(result);
	};
	const label = (good: string) => good.replace(/_/g, " ");
</script>

<svelte:head><title>Armaments market · PsyOps</title></svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader
		title="Armaments market"
		subtitle="Military hardware — outside-bloc sales need a minister's approval"
		icon={FluentShield20Filled}
	/>

	{#if form && "error" in form && form.error}
		<p class="panel field-error mb-4 p-3 text-sm">{String(form.error)}</p>
	{/if}

	<section class="panel animate-rise-in rounded-sm p-4 space-y-3">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Offer armaments</h2>
			<span class="text-xs text-fg-muted">
				{(data.held ?? []).reduce((n, h) => n + h.quantity, 0).toLocaleString()} units in stock
			</span>
		</div>
		<form method="POST" action="?/list" use:enhance={submit} class="grid gap-2 sm:grid-cols-4">
			<label class="block">
				<span class="field-label">Hardware</span>
				<select name="good" class="field-control w-full rounded-sm px-2 py-2" required>
					{#each data.goods as good (good.id)}
						<option value={good.id}>
							{label(good.id)} — {data.held.find((h) => h.good === good.id)?.quantity ?? 0} held
						</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="field-label">Quantity</span>
				<input
					type="number"
					name="quantity"
					class="field-control w-full rounded-sm px-2 py-2"
					min={data.minQuantity}
					max={data.maxQuantity}
					value="10"
					required
				/>
			</label>
			<label class="block">
				<span class="field-label">Price each</span>
				<input type="number" name="pricePerUnit" class="field-control w-full rounded-sm px-2 py-2" min="1" value="100" required />
			</label>
			<label class="block">
				<span class="field-label">Buyer</span>
				<select name="targetStateId" class="field-control w-full rounded-sm px-2 py-2">
					<option value="">Anyone</option>
					{#each data.states as state (state.id)}
						<option value={state.id} selected={data.state?.id === state.id}>
							{state.name}{state.sameBloc ? " · bloc" : " · outside bloc → approval"}
						</option>
					{/each}
				</select>
			</label>
			<div class="sm:col-span-4 flex flex-wrap items-center gap-3">
				<Button type="submit" size="sm">Publish offer</Button>
				<p class="text-xs text-fg-muted">
					Sales outside the bloc stay pending until your defence minister or president approves them.
					Approved external sales pay a {data.exportTax}% export levy to your state's treasury.
				</p>
			</div>
		</form>
	</section>

	<section class="panel animate-rise-in mt-4 rounded-sm p-4" style="--rise-delay: 80ms">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="section-title">Live offers</h2>
			{#if data.board.canApprove}
				<Badge tone="blue" size="xs">You can approve {data.board.authority === "president" ? "as president" : "as defence minister"}</Badge>
			{/if}
		</div>

		{#if data.board.offers.length}
			<ul class="mt-3 space-y-2">
				{#each data.board.offers as offer (offer.id)}
					<li class="panel-muted rounded-sm px-3 py-2.5">
						<div class="flex flex-wrap items-start gap-x-4 gap-y-2">
							<div class="min-w-0 flex-1">
								<p class="text-sm font-semibold text-fg">
									{label(offer.good)} × {offer.quantity.toLocaleString()}
									<span class="font-mono text-primary-fg">${offer.pricePerUnit.toLocaleString()}/unit</span>
								</p>
								<p class="text-[11px] text-fg-muted">
									{offer.sellerName ?? "Unknown seller"} → {offer.targetName}
									{#if offer.external} · outside bloc{/if}
									· reference value ${offer.value.toLocaleString()}
								</p>
							</div>
							{#if offer.pending}
								<Badge tone="amber" size="xs">Awaiting approval</Badge>
							{:else}
								<Badge tone="green" size="xs">Cleared</Badge>
							{/if}
						</div>

						<div class="mt-2 flex flex-wrap gap-2">
							{#if data.board.canApprove && offer.pending && offer.external}
								<form method="POST" action="?/approve" use:enhance={submit}>
									<input type="hidden" name="listingId" value={offer.id} />
									<Button type="submit" size="xs" variant="secondary">Approve</Button>
								</form>
								<form method="POST" action="?/reject" use:enhance={submit}>
									<input type="hidden" name="listingId" value={offer.id} />
									<Button type="submit" size="xs" variant="ghost">Refuse</Button>
								</form>
							{/if}
							{#if offer.sellerId === data.board.viewerId}
								<form method="POST" action="?/withdraw" use:enhance={submit}>
									<input type="hidden" name="listingId" value={offer.id} />
									<Button type="submit" size="xs" variant="ghost">Withdraw</Button>
								</form>
							{/if}
							{#if !offer.pending && offer.held > 0}
								<form method="POST" action="?/buy" use:enhance={submit} class="flex items-center gap-1.5">
									<input type="hidden" name="listingId" value={offer.id} />
									<input
										type="number"
										name="quantity"
										min="1"
										max={offer.quantity}
										value="1"
										aria-label="Quantity to buy"
										class="field-control w-16 rounded-sm px-1.5 py-1 text-xs"
									/>
									<Button type="submit" size="xs" variant="primary">Buy</Button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-3 text-sm text-fg-muted">No armaments are being offered right now.</p>
		{/if}
	</section>
</PageContainer>
