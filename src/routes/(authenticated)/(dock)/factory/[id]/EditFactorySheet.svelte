<!-- src/routes/(authenticated)/(dock)/factory/[id]/EditFactorySheet.svelte -->
<script lang="ts">
	import { superForm, type SuperValidated } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentClock20Filled from "~icons/fluent/clock-20-filled";
	import FluentChartMultiple20Filled from "~icons/fluent/chart-multiple-20-filled";
	import { editFactorySchema } from "./schema.js";
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import ResourceRequirements from "#lib/component/ResourceRequirements.svelte";
	import Button from "#lib/component/ui/Button.svelte";

	let {
		open = $bindable(false),
		editForm,
		factory,
		editCost,
		userBalance,
		canAfford,
		isOnCooldown,
		cooldownEndsAt,
		wageStats
	}: {
		open: boolean;
		editForm: SuperValidated<any>;
		factory: { id: number; name: string; workerWage: number; currentWorkers: number };
		editCost: number;
		userBalance: number;
		canAfford: boolean;
		isOnCooldown: boolean;
		cooldownEndsAt: string | null;
		wageStats: { highestInRegion: number | null; averageInRegion: number | null };
	} = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(editForm, {
		validators: valibotClient(editFactorySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null,
		onUpdated({ form }) {
			if (form.valid && form.message && !/error|failed|wait|insufficient/i.test(form.message)) {
				open = false;
			}
		}
	});

	function formatTimeRemaining(cooldownEnd: string): string {
		const now = new Date();
		const end = new Date(cooldownEnd);
		const diff = end.getTime() - now.getTime();
		const minutes = Math.floor(diff / (1000 * 60));
		if (minutes >= 60) {
			return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) !== 1 ? "s" : ""}`;
		} else {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
		}
	}

	function formatCooldownDate(cooldownEnd: string): string {
		return new Date(cooldownEnd).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true
		});
	}

	function getWagePosition(): string {
		if (!wageStats.highestInRegion) return "Unknown";
		const current = $form.workerWage;
		const highest = wageStats.highestInRegion;
		const average = wageStats.averageInRegion || 0;
		if (current >= highest) return "Highest";
		if (current >= average) return "Above Average";
		if (current >= average * 0.8) return "Average";
		return "Below Average";
	}

	function getWageColor(): string {
		const position = getWagePosition();
		if (position === "Highest") return "text-[#b9f29a]";
		if (position === "Above Average") return "text-[#b3dcff]";
		if (position === "Average") return "text-[#ffd35c]";
		return "text-red-300";
	}

	const canEdit = !isOnCooldown && canAfford;
</script>

<BottomSheet bind:open title="Edit Factory">
	<div class="space-y-5">
		<!-- Cooldown Warning -->
		{#if isOnCooldown && cooldownEndsAt}
			<div class="bg-red-600/10 border border-red-500/30 rounded-sm p-4 space-y-2">
				<div class="flex items-start gap-3">
					<FluentClock20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
					<div class="space-y-1.5 flex-1">
						<h3 class="font-semibold text-red-300 text-sm">Edit Cooldown Active</h3>
						<div class="flex items-center justify-between text-xs">
							<span class="text-[#d3caa9] font-medium">Time Remaining:</span>
							<span class="text-red-300 font-bold font-mono">{formatTimeRemaining(cooldownEndsAt)}</span>
						</div>
						<div class="flex items-center justify-between text-xs">
							<span class="text-[#a8a083]">Available on:</span>
							<span class="text-[#d3caa9]">{formatCooldownDate(cooldownEndsAt)}</span>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<form method="POST" action="?/updateFactory" use:enhance class="space-y-5">
			<!-- Factory Details -->
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<FluentFactory20Filled class="size-4 text-[#c08cf0]" />
					<h2 class="text-sm font-semibold text-[#f5efd8]">Factory Details</h2>
				</div>

				<div>
					<label for="edit-factory-name" class="field-label">
						Factory Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="edit-factory-name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Northern Steel Mill"
						maxlength="100"
						class="field-control w-full rounded-sm px-3 py-2.5"
						class:border-red-500={$errors.name}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.name}
						<p class="field-error">{$errors.name}</p>
					{:else}
						<p class="field-hint">{$form.name?.length || 0}/100 characters</p>
					{/if}
				</div>

				<div>
					<label for="edit-factory-wage" class="field-label">
						Worker Wage per Shift <span class="text-red-400">*</span>
					</label>
					<div class="relative">
						<FluentMoney20Filled class="size-4 text-[#a8a083] absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							type="number"
							id="edit-factory-wage"
							name="workerWage"
							bind:value={$form.workerWage}
							min="100"
							max="1000000"
							step="100"
							class="field-control w-full rounded-sm pl-8 pr-3 py-2.5"
							class:border-red-500={$errors.workerWage}
							disabled={$submitting || !canEdit}
						/>
					</div>
					{#if $errors.workerWage}
						<p class="field-error">{$errors.workerWage}</p>
					{:else}
						<div class="flex items-center justify-between text-xs text-[#a8a083] mt-1">
							<span>Min: 100 • Max: 1,000,000</span>
							{#if wageStats.highestInRegion}
								<span class={getWageColor()}>{getWagePosition()}</span>
							{/if}
						</div>
					{/if}

					{#if factory.currentWorkers > 0}
						<div class="mt-3 panel-muted rounded-sm p-3">
							<div class="flex items-center gap-2 mb-2">
								<FluentChartMultiple20Filled class="size-3.5 text-[#a8a083]" />
								<p class="text-xs text-[#a8a083]">Cost Impact per Shift</p>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-[#d3caa9]">Current:</span>
								<span class="text-sm font-semibold text-[#f5efd8] font-mono">
									{(factory.workerWage * factory.currentWorkers).toLocaleString()}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-[#d3caa9]">New:</span>
								<span class="text-sm font-semibold text-[#b9f29a] font-mono">
									{($form.workerWage * factory.currentWorkers).toLocaleString()}
								</span>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<ResourceRequirements costs={{ currency: editCost }} available={{ currency: userBalance }} />

			<Button
				type="submit"
				variant="primary"
				block
				disabled={$submitting || !canEdit}
				loading={$delayed}
				loadingText="Saving..."
				icon={FluentCheckmark20Filled}
			>
				Save Changes
			</Button>
		</form>

		<!-- Success Message -->
		{#if $message && !$message.includes("error") && !$message.includes("failed") && !$message.includes("wait") && !$message.includes("Insufficient")}
			<div class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-center gap-3">
				<p class="text-sm font-medium">{$message}</p>
			</div>
		{/if}

		<!-- Error Message -->
		{#if $message && ($message.includes("error") || $message.includes("failed") || $message.includes("wait") || $message.includes("Insufficient"))}
			<div class="bg-red-600/10 border border-red-500/30 text-red-300 rounded-sm p-4 flex items-center gap-3">
				<p class="text-sm font-medium">{$message}</p>
			</div>
		{/if}
	</div>
</BottomSheet>
