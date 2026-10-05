<!-- src/routes/(authenticated)/admin/giftcode/+page.svelte -->
<script lang="ts">
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentAdd20Filled from "~icons/fluent/add-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentEyeOff20Filled from "~icons/fluent/eye-off-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import ResourceIcon from "#lib/component/ResourceIcon.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import { Button, IconButton, Badge, badgeClass } from "#lib/component/ui/index.js";
	import { enhance } from "$app/forms";

	let { data, form } = $props();

	let showCreateModal = $state(false);
	let newCode = $state({
		code: "",
		description: "",
		currencyAmount: 0,
		premiumDays: 0,
		maxRedemptions: "",
		expiresAt: "",
		resources: [] as Array<{ type: string; quantity: number }>
	});

	let newResource = $state({ type: "iron", quantity: 0 });
	let submitting = $state(false);

	const resourceTypes = [
		"iron",
		"copper",
		"steel",
		"gunpowder",
		"wood",
		"coal",
		"rifles",
		"ammunition",
		"artillery",
		"vehicles",
		"explosives"
	];

	const resourceIcons: Record<string, string> = {
		iron: "⛏️",
		copper: "🔶",
		steel: "🔩",
		gunpowder: "💥",
		wood: "🪵",
		coal: "⚫",
		rifles: "🔫",
		ammunition: "🔫",
		artillery: "💣",
		vehicles: "🚗",
		explosives: "💥"
	};

	function addResource() {
		if (newResource.quantity > 0) {
			newCode.resources = [...newCode.resources, { type: newResource.type, quantity: newResource.quantity }];
			newResource = { type: "iron", quantity: 0 };
		}
	}

	function removeResource(index: number) {
		newCode.resources = newCode.resources.filter((_, i) => i !== index);
	}

	function resetForm() {
		newCode = {
			code: "",
			description: "",
			currencyAmount: 0,
			premiumDays: 0,
			maxRedemptions: "",
			expiresAt: "",
			resources: []
		};
		showCreateModal = false;
	}

	function formatDate(date: Date | string | null) {
		if (!date) return "Never";
		const d = new Date(date);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function formatNumber(num: number) {
		return new Intl.NumberFormat().format(num);
	}

	function generateRandomCode() {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		let code = "";
		for (let i = 0; i < 12; i++) {
			if (i > 0 && i % 4 === 0) code += "-";
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		newCode.code = code;
	}

	$effect(() => {
		if (form?.success) {
			resetForm();
		}
	});
</script>

<PageContainer maxWidth="6xl">
	<!-- Header -->
	<PageHeader
		title="Gift Code Management"
		subtitle="Create and manage promotional gift codes"
		icon={FluentGift20Filled}
		backHref="/admin"
		backLabel="Admin Panel"
	>
		{#snippet actions()}
			<Button type="button" variant="primary" icon={FluentAdd20Filled} onclick={() => (showCreateModal = true)}>
				Create Code
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 text-[#c6dfbf] rounded-sm p-4 flex items-center gap-3">
			<FluentCheckmark20Filled class="size-5 shrink-0" />
			<p class="font-medium">{form.message || "Operation successful"}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
			<FluentDismiss20Filled class="size-5 shrink-0" />
			<p class="font-medium">{form.error}</p>
		</div>
	{/if}

	<!-- Stats -->
	{#if data.giftCodes && data.giftCodes.length > 0}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
				<FluentGift20Filled class="size-5 text-[#7ba0c8] shrink-0" />
				<div class="min-w-0">
					<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Total Codes</p>
					<p class="text-2xl font-bold text-[#fff7e8]">{data.giftCodes.length}</p>
				</div>
			</div>

			<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
				<FluentCheckmark20Filled class="size-5 text-[#8fae88] shrink-0" />
				<div class="min-w-0">
					<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Active Codes</p>
					<p class="text-2xl font-bold text-[#fff7e8]">
						{data.giftCodes.filter((c) => c.isActive).length}
					</p>
				</div>
			</div>

			<div class="panel-muted rounded-sm p-3 flex items-center gap-2">
				<FluentPeople20Filled class="size-5 text-[#b7a0c5] shrink-0" />
				<div class="min-w-0">
					<p class="text-[10px] text-[#a89e8e] uppercase tracking-wide">Total Redemptions</p>
					<p class="text-2xl font-bold text-[#fff7e8]">
						{data.giftCodes.reduce((sum, c) => sum + c.currentRedemptions, 0)}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Gift Codes Table -->
	<div class="panel rounded-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="table w-full">
				<thead class="bg-[#102239]/70">
					<tr class="text-[#d9ccb7]">
						<th class="font-semibold">Code</th>
						<th class="font-semibold">Description</th>
						<th class="font-semibold">Rewards</th>
						<th class="font-semibold">Usage</th>
						<th class="font-semibold">Expires</th>
						<th class="font-semibold">Status</th>
						<th class="font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.giftCodes as code}
						<tr class="hover:bg-[#19304b]/40 transition-colors">
							<td>
								<code class="text-[#d5c4df] font-mono font-semibold text-xs sm:text-sm">{code.code}</code>
							</td>
							<td>
								<p class="text-sm text-[#d9ccb7] max-w-xs truncate">
									{code.description || "—"}
								</p>
							</td>
							<td>
								<div class="flex flex-wrap gap-1.5">
									{#if code.currencyAmount > 0}
										<Badge tone="amber">💰 {formatNumber(code.currencyAmount)}</Badge>
									{/if}
									{#if code.premiumDays > 0}
										<Badge tone="amber">⭐ {formatNumber(code.premiumDays)}d premium</Badge>
									{/if}
									{#each code.resources as resource}
										<Badge tone="blue">
											<ResourceIcon name={resource.resourceType} class="size-3.5" />
											{formatNumber(resource.quantity)}
										</Badge>
									{/each}
									{#if code.currencyAmount === 0 && code.premiumDays === 0 && code.resources.length === 0}
										<span class="text-[#a89e8e] text-xs">No rewards</span>
									{/if}
								</div>
							</td>
							<td>
								<div class="text-sm">
									<span class="text-[#fff7e8] font-medium">{code.currentRedemptions}</span>
									<span class="text-[#a89e8e]">
										/ {code.maxRedemptions ? code.maxRedemptions : "∞"}
									</span>
								</div>
							</td>
							<td>
								<div class="text-xs sm:text-sm text-[#d9ccb7] whitespace-nowrap">
									{formatDate(code.expiresAt)}
								</div>
							</td>
							<td>
								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="codeId" value={code.id} />
									<button
										type="submit"
										class="{badgeClass({
											tone: code.isActive ? 'green' : 'neutral'
										})} gap-1.5 transition-colors cursor-pointer hover:opacity-80"
									>
										{#if code.isActive}
											<FluentEye20Filled class="size-3" />
											Active
										{:else}
											<FluentEyeOff20Filled class="size-3" />
											Inactive
										{/if}
									</button>
								</form>
							</td>
							<td>
								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="codeId" value={code.id} />
									<IconButton
										type="submit"
										icon={FluentDelete20Filled}
										label="Delete gift code"
										variant="soft-red"
										size="sm"
										shape="square"
										onclick={(e) => {
											if (!confirm(`Delete gift code "${code.code}"?`)) {
												e.preventDefault();
											}
										}}
									/>
								</form>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="text-center py-8 text-[#a89e8e]">
								No gift codes created yet. Click "Create Code" to get started.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</PageContainer>

<!-- Create Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
		onclick={(e) => {
			if (e.target === e.currentTarget && !submitting) resetForm();
		}}
	>
		<div class="panel bg-[#14283f] rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
				class="p-6 space-y-5"
			>
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-[#dfceb0]/10 pb-4">
					<div class="flex items-center gap-3">
						<div class="bg-[#8c709b]/15 border border-[#b7a0c5]/30 p-2 rounded-sm shrink-0">
							<FluentGift20Filled class="size-6 text-[#b7a0c5]" />
						</div>
						<h2 class="text-xl sm:text-2xl font-bold text-[#fff7e8]">Create Gift Code</h2>
					</div>
					<IconButton
						type="button"
						icon={FluentDismiss20Filled}
						label="Close"
						size="sm"
						onclick={resetForm}
						disabled={submitting}
					/>
				</div>

				<!-- Code -->
				<div class="space-y-2">
					<label for="code" class="field-label">
						Code <span class="text-red-400">*</span>
					</label>
					<div class="flex gap-2">
						<input
							type="text"
							id="code"
							name="code"
							bind:value={newCode.code}
							placeholder="e.g., WELCOME2025"
							required
							disabled={submitting}
							class="field-control rounded-sm px-3 py-2.5 flex-1 min-w-0 font-mono uppercase"
						/>
						<Button type="button" variant="secondary" onclick={generateRandomCode} disabled={submitting}>
							Generate
						</Button>
					</div>
					<p class="field-hint">Codes are case-insensitive and must be unique</p>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<label for="description" class="field-label"> Description </label>
					<textarea
						id="description"
						name="description"
						bind:value={newCode.description}
						placeholder="What is this code for?"
						rows="2"
						disabled={submitting}
						class="field-control rounded-sm px-3 py-2.5 w-full"></textarea>
				</div>

				<!-- Currency Amount -->
				<div class="space-y-2">
					<label for="currencyAmount" class="field-label"> Currency Reward </label>
					<input
						type="number"
						id="currencyAmount"
						name="currencyAmount"
						bind:value={newCode.currencyAmount}
						min="0"
						step="100"
						disabled={submitting}
						class="field-control rounded-sm px-3 py-2.5 w-full"
					/>
				</div>

				<!-- Premium Days -->
				<div class="space-y-2">
					<label for="premiumDays" class="field-label"> ⭐ Premium Reward (days) </label>
					<input
						type="number"
						id="premiumDays"
						name="premiumDays"
						bind:value={newCode.premiumDays}
						min="0"
						step="1"
						disabled={submitting}
						class="field-control rounded-sm px-3 py-2.5 w-full"
					/>
					<p class="field-hint">Number of premium days granted on redemption (0 = none)</p>
				</div>

				<!-- Resources -->
				<div class="space-y-3">
					<label class="field-label">Resource Rewards</label>

					<div class="flex gap-2">
						<select
							bind:value={newResource.type}
							disabled={submitting}
							class="field-control rounded-sm px-3 py-2.5 flex-1 min-w-0"
						>
							{#each resourceTypes as type}
								<option value={type}>
									{resourceIcons[type] || "📦"}
									{type.charAt(0).toUpperCase() + type.slice(1)}
								</option>
							{/each}
						</select>
						<input
							type="number"
							bind:value={newResource.quantity}
							min="1"
							placeholder="Qty"
							disabled={submitting}
							class="field-control rounded-sm px-3 py-2.5 w-24"
						/>
						<IconButton
							type="button"
							icon={FluentAdd20Filled}
							label="Add resource"
							variant="soft-purple"
							shape="square"
							onclick={addResource}
							disabled={submitting || newResource.quantity <= 0}
						/>
					</div>

					{#if newCode.resources.length > 0}
						<div class="flex flex-wrap gap-2 mt-2">
							{#each newCode.resources as resource, index}
								<div class="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#315d8d]/18 border border-[#7ba0c8]/30">
									<span class="flex items-center gap-1 text-sm text-[#b7d0e6] font-medium">
										<ResourceIcon name={resource.type} class="size-3.5" />
										{formatNumber(resource.quantity)}
										{resource.type}
									</span>
									<IconButton
										type="button"
										icon={FluentDismiss20Filled}
										label="Remove resource"
										size="xs"
										onclick={() => removeResource(index)}
										disabled={submitting}
									/>
								</div>
							{/each}
						</div>
					{/if}

					<input type="hidden" name="resources" value={JSON.stringify(newCode.resources)} />
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<!-- Max Redemptions -->
					<div class="space-y-2">
						<label for="maxRedemptions" class="field-label"> Max Redemptions </label>
						<input
							type="number"
							id="maxRedemptions"
							name="maxRedemptions"
							bind:value={newCode.maxRedemptions}
							min="1"
							placeholder="Unlimited"
							disabled={submitting}
							class="field-control rounded-sm px-3 py-2.5 w-full"
						/>
						<p class="field-hint">Leave empty for unlimited</p>
					</div>

					<!-- Expires At -->
					<div class="space-y-2">
						<label for="expiresAt" class="field-label"> Expires At </label>
						<input
							type="datetime-local"
							id="expiresAt"
							name="expiresAt"
							bind:value={newCode.expiresAt}
							disabled={submitting}
							class="field-control rounded-sm px-3 py-2.5 w-full"
						/>
						<p class="field-hint">Leave empty for no expiration</p>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#dfceb0]/10">
					<Button type="button" variant="secondary" grow onclick={resetForm} disabled={submitting}>Cancel</Button>
					<Button
						type="submit"
						variant="primary"
						grow
						icon={FluentCheckmark20Filled}
						loading={submitting}
						loadingText="Creating..."
						disabled={submitting || !newCode.code}
					>
						Create Gift Code
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
