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
	import ResourceIcon from "$lib/component/ResourceIcon.svelte";
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

<div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<div
				class="size-12 sm:size-16 bg-[#8c709b]/20 rounded-2xl flex items-center justify-center shrink-0"
			>
				<FluentGift20Filled class="size-6 sm:size-8 text-[#d5c4df]" />
			</div>
			<div>
				<h1 class="text-2xl sm:text-3xl font-bold text-[#fff7e8]">Gift Code Management</h1>
				<p class="text-sm sm:text-base text-[#a89e8e]">Create and manage promotional gift codes</p>
			</div>
		</div>

		<button
			type="button"
			onclick={() => (showCreateModal = true)}
			class="btn btn-sm sm:btn-md bg-[#e6a527] hover:bg-[#f2b940] border border-[#f2c463] text-[#172a45] gap-2 w-full sm:w-auto"
		>
			<FluentAdd20Filled class="size-5" />
			Create Code
		</button>
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="bg-[#587252]/18 border border-[#8fae88]/30 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<FluentCheckmark20Filled class="size-5 text-[#c6dfbf] shrink-0" />
				<p class="text-[#c6dfbf] font-medium">{form.message || "Operation successful"}</p>
			</div>
		</div>
	{/if}

	{#if form?.error}
		<div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
			<div class="flex items-center gap-3">
				<FluentDismiss20Filled class="size-5 text-red-300 shrink-0" />
				<p class="text-red-300 font-medium">{form.error}</p>
			</div>
		</div>
	{/if}

	<!-- Stats -->
	{#if data.giftCodes && data.giftCodes.length > 0}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			<div class="panel rounded-xl p-5">
				<div class="flex items-center gap-3">
					<div class="bg-[#315d8d]/20 p-3 rounded-lg shrink-0">
						<FluentGift20Filled class="size-6 text-[#7ba0c8]" />
					</div>
					<div>
						<p class="text-sm text-[#a89e8e]">Total Codes</p>
						<p class="text-2xl font-bold text-[#fff7e8]">{data.giftCodes.length}</p>
					</div>
				</div>
			</div>

			<div class="panel rounded-xl p-5">
				<div class="flex items-center gap-3">
					<div class="bg-[#587252]/20 p-3 rounded-lg shrink-0">
						<FluentCheckmark20Filled class="size-6 text-[#c6dfbf]" />
					</div>
					<div>
						<p class="text-sm text-[#a89e8e]">Active Codes</p>
						<p class="text-2xl font-bold text-[#fff7e8]">
							{data.giftCodes.filter((c) => c.isActive).length}
						</p>
					</div>
				</div>
			</div>

			<div class="panel rounded-xl p-5">
				<div class="flex items-center gap-3">
					<div class="bg-[#8c709b]/20 p-3 rounded-lg shrink-0">
						<FluentPeople20Filled class="size-6 text-[#d5c4df]" />
					</div>
					<div>
						<p class="text-sm text-[#a89e8e]">Total Redemptions</p>
						<p class="text-2xl font-bold text-[#fff7e8]">
							{data.giftCodes.reduce((sum, c) => sum + c.currentRedemptions, 0)}
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Gift Codes Table -->
	<div class="panel rounded-xl overflow-hidden">
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
										<span class="badge badge-sm bg-[#e6a527]/15 text-[#f7c56b] border-[#e6a527]/35">
											💰 {formatNumber(code.currencyAmount)}
										</span>
									{/if}
									{#if code.premiumDays > 0}
										<span class="badge badge-sm bg-[#e6a527]/15 text-[#f7c56b] border-[#e6a527]/35">
											⭐ {formatNumber(code.premiumDays)}d premium
										</span>
									{/if}
									{#each code.resources as resource}
										<span class="badge badge-sm bg-[#315d8d]/20 text-[#b7d0e6] border-[#7ba0c8]/30 gap-1">
											<ResourceIcon name={resource.resourceType} class="size-3.5" />
											{formatNumber(resource.quantity)}
										</span>
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
										class="badge badge-sm gap-1.5 transition-colors cursor-pointer hover:opacity-80 {code.isActive
											? 'bg-[#587252]/20 text-[#c6dfbf] border-[#8fae88]/30'
											: 'bg-[#14283f] text-[#d9ccb7] border-[#dfceb0]/20'}"
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
									<button
										type="submit"
										class="btn btn-ghost btn-sm text-red-400 hover:text-red-300 hover:bg-red-600/10"
										onclick={(e) => {
											if (!confirm(`Delete gift code "${code.code}"?`)) {
												e.preventDefault();
											}
										}}
									>
										<FluentDelete20Filled class="size-4" />
									</button>
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
</div>

<!-- Create Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
		onclick={(e) => {
			if (e.target === e.currentTarget && !submitting) resetForm();
		}}
	>
		<div class="panel rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
						<div class="bg-[#8c709b]/20 p-2 rounded-lg shrink-0">
							<FluentGift20Filled class="size-6 text-[#fff7e8]" />
						</div>
						<h2 class="text-xl sm:text-2xl font-bold text-[#fff7e8]">Create Gift Code</h2>
					</div>
					<button type="button" onclick={resetForm} class="btn btn-ghost btn-sm btn-circle" disabled={submitting}>
						<FluentDismiss20Filled class="size-5" />
					</button>
				</div>

				<!-- Code -->
				<div class="space-y-2">
					<label for="code" class="block text-sm font-medium text-[#e5d8c1]">
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
							class="input flex-1 field-control font-mono uppercase"
						/>
						<button
							type="button"
							onclick={generateRandomCode}
							disabled={submitting}
							class="btn bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 text-[#e5d8c1] hover:text-[#fff7e8]"
						>
							Generate
						</button>
					</div>
					<p class="text-xs text-[#a89e8e]">Codes are case-insensitive and must be unique</p>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<label for="description" class="block text-sm font-medium text-[#e5d8c1]"> Description </label>
					<textarea
						id="description"
						name="description"
						bind:value={newCode.description}
						placeholder="What is this code for?"
						rows="2"
						disabled={submitting}
						class="textarea w-full field-control"></textarea>
				</div>

				<!-- Currency Amount -->
				<div class="space-y-2">
					<label for="currencyAmount" class="block text-sm font-medium text-[#e5d8c1]"> Currency Reward </label>
					<input
						type="number"
						id="currencyAmount"
						name="currencyAmount"
						bind:value={newCode.currencyAmount}
						min="0"
						step="100"
						disabled={submitting}
						class="input w-full field-control"
					/>
				</div>

				<!-- Premium Days -->
				<div class="space-y-2">
					<label for="premiumDays" class="block text-sm font-medium text-[#e5d8c1]"> ⭐ Premium Reward (days) </label>
					<input
						type="number"
						id="premiumDays"
						name="premiumDays"
						bind:value={newCode.premiumDays}
						min="0"
						step="1"
						disabled={submitting}
						class="input w-full field-control"
					/>
					<p class="text-xs text-[#a89e8e]">Number of premium days granted on redemption (0 = none)</p>
				</div>

				<!-- Resources -->
				<div class="space-y-3">
					<label class="block text-sm font-medium text-[#e5d8c1]">Resource Rewards</label>

					<div class="flex gap-2">
						<select
							bind:value={newResource.type}
							disabled={submitting}
							class="select field-control flex-1"
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
							class="input field-control w-24"
						/>
						<button
							type="button"
							onclick={addResource}
							disabled={submitting || newResource.quantity <= 0}
							class="btn bg-[#8c709b]/25 hover:bg-[#8c709b]/40 border border-[#b7a0c5]/30 text-[#d5c4df]"
						>
							<FluentAdd20Filled class="size-5" />
						</button>
					</div>

					{#if newCode.resources.length > 0}
						<div class="flex flex-wrap gap-2 mt-2">
							{#each newCode.resources as resource, index}
								<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#315d8d]/18 border border-[#7ba0c8]/30">
									<span class="flex items-center gap-1 text-sm text-[#b7d0e6] font-medium">
										<ResourceIcon name={resource.type} class="size-3.5" />
										{formatNumber(resource.quantity)}
										{resource.type}
									</span>
									<button
										type="button"
										onclick={() => removeResource(index)}
										disabled={submitting}
										class="btn btn-ghost btn-xs btn-circle text-[#7ba0c8] hover:text-[#b7d0e6]"
									>
										<FluentDismiss20Filled class="size-3" />
									</button>
								</div>
							{/each}
						</div>
					{/if}

					<input type="hidden" name="resources" value={JSON.stringify(newCode.resources)} />
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<!-- Max Redemptions -->
					<div class="space-y-2">
						<label for="maxRedemptions" class="block text-sm font-medium text-[#e5d8c1]"> Max Redemptions </label>
						<input
							type="number"
							id="maxRedemptions"
							name="maxRedemptions"
							bind:value={newCode.maxRedemptions}
							min="1"
							placeholder="Unlimited"
							disabled={submitting}
							class="input w-full field-control"
						/>
						<p class="text-xs text-[#a89e8e]">Leave empty for unlimited</p>
					</div>

					<!-- Expires At -->
					<div class="space-y-2">
						<label for="expiresAt" class="block text-sm font-medium text-[#e5d8c1]"> Expires At </label>
						<input
							type="datetime-local"
							id="expiresAt"
							name="expiresAt"
							bind:value={newCode.expiresAt}
							disabled={submitting}
							class="input w-full field-control"
						/>
						<p class="text-xs text-[#a89e8e]">Leave empty for no expiration</p>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#dfceb0]/10">
					<button
						type="button"
						onclick={resetForm}
						disabled={submitting}
						class="btn flex-1 bg-[#14283f] hover:bg-[#19304b] border border-[#dfceb0]/25 text-[#e5d8c1] hover:text-[#fff7e8]"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={submitting || !newCode.code}
						class="btn flex-1 bg-[#e6a527] hover:bg-[#f2b940] border border-[#f2c463] text-[#172a45] gap-2"
					>
						{#if submitting}
							<span class="loading loading-spinner loading-sm"></span>
							Creating...
						{:else}
							<FluentCheckmark20Filled class="size-5" />
							Create Gift Code
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
