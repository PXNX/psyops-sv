<!-- src/routes/party/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { createPartySchema } from "../../create/schema";
	import { useImageUpload } from "$lib/utils/edit/useImageUpload.svelte";
	import {
		EditPageLayout,
		EditSection,
		EditImageUpload,
		EditColorPicker,
		EditCooldownWarning,
		EditInsufficientFundsWarning,
		EditMessage,
		EditFormActions,
		EditInfoBox,
		EditStatCard
	} from "$lib/component/edit";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentFlag20Filled from "~icons/fluent/flag-20-filled";
	import FluentColor20Filled from "~icons/fluent/color-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";
	import FluentMoney20Filled from "~icons/fluent/money-20-filled";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(createPartySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	// Image upload handling
	const imageUpload = useImageUpload(data.party.logoUrl);

	$effect(() => {
		return () => imageUpload.cleanup(data.party.logoUrl);
	});

	const ideologies = [
		"Liberal",
		"Conservative",
		"Socialist",
		"Libertarian",
		"Green",
		"Nationalist",
		"Progressive",
		"Centrist",
		"Social Democrat",
		"Other"
	];

	const canEdit = $derived(!data.isOnCooldown && data.canAfford);
</script>

<EditPageLayout title="Edit Party" subtitle={data.party.name} backHref="/party/{data.party.id}">
	{#snippet stats()}
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<EditStatCard label="Your Balance" value={data.userBalance} icon={FluentMoney20Filled} color="green" />
			<EditStatCard label="Edit Cost" value={data.editCost} icon={FluentFlag20Filled} color="purple" />
		</div>
	{/snippet}

	<!-- Cooldown Warning -->
	{#if data.isOnCooldown && data.cooldownEndsAt}
		<EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="party" />
	{/if}

	<!-- Insufficient Funds Warning -->
	{#if !data.canAfford && !data.isOnCooldown}
		<EditInsufficientFundsWarning editCost={data.editCost} userBalance={data.userBalance} />
	{/if}

	<!-- Messages -->
	<EditMessage message={$message} />

	<!-- Form -->
	<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Party Name -->
		<EditSection title="Party Details" icon={FluentFlag20Filled}>
			<div class="space-y-4">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
						Party Name <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="e.g., Progressive Alliance Party"
						maxlength="100"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						class:input-error={$errors.name}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.name}
						<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/100 characters</p>
					{/if}
				</div>

				<div>
					<label for="abbreviation" class="block text-sm font-medium text-gray-300 mb-2">
						Abbreviation (Optional)
					</label>
					<input
						type="text"
						id="abbreviation"
						name="abbreviation"
						bind:value={$form.abbreviation}
						placeholder="e.g., PROG"
						maxlength="4"
						class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
						class:input-error={$errors.abbreviation}
						disabled={$submitting || !canEdit}
					/>
					{#if $errors.abbreviation}
						<p class="text-xs text-red-400 mt-1">{$errors.abbreviation}</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">
							{$form.abbreviation?.length || 0}/4 characters • Alphanumeric only
						</p>
					{/if}
				</div>
			</div>
		</EditSection>

		<!-- Party Logo -->
		<EditSection title="Party Logo" icon={FluentImage20Filled}>
			<EditImageUpload
				bind:previewUrl={imageUpload.previewUrl}
				bind:dragActive={imageUpload.dragActive}
				bind:fileInputElement={imageUpload.fileInput}
				disabled={$submitting || !canEdit}
				error={$errors.logo}
				entityName="party logo"
				file={imageUpload.currentFile}
				onFileSelect={(e) => {
					imageUpload.handleFileSelect(e, data.party.logoUrl);
					$form.logo = imageUpload.currentFile;
				}}
				onDrop={(e) => {
					imageUpload.handleDrop(e, data.party.logoUrl);
					$form.logo = imageUpload.currentFile;
				}}
				onDragOver={imageUpload.handleDragOver}
				onDragLeave={imageUpload.handleDragLeave}
				onClearImage={() => {
					imageUpload.clearImage(data.party.logoUrl);
					$form.logo = undefined;
				}}
				onClickUpload={() => imageUpload.fileInput?.click()}
			/>
		</EditSection>

		<!-- Party Color -->
		<EditSection title="Party Color" icon={FluentColor20Filled}>
			<EditColorPicker
				bind:color={$form.color}
				disabled={$submitting || !canEdit}
				error={$errors.color}
				previewIcon={FluentPeople20Filled}
				previewTitle={$form.name || "Your Party Name"}
				previewSubtitle={$form.abbreviation || "Abbreviation"}
				previewImageUrl={imageUpload.previewUrl}
			/>
		</EditSection>

		<!-- Ideology -->
		<EditSection title="Political Alignment" icon={FluentBuildingGovernment20Filled}>
			<div>
				<label for="ideology" class="block text-sm font-medium text-gray-300 mb-2">
					Ideology <span class="text-red-400">*</span>
				</label>
				<select
					id="ideology"
					name="ideology"
					bind:value={$form.ideology}
					class="select w-full bg-slate-700/50 border-slate-600/30 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.ideology}
					disabled={$submitting || !canEdit}
				>
					<option value="">Select an ideology...</option>
					{#each ideologies as ideologyOption}
						<option value={ideologyOption.toLowerCase()}>{ideologyOption}</option>
					{/each}
				</select>
				{#if $errors.ideology}
					<p class="text-xs text-red-400 mt-1">{$errors.ideology}</p>
				{/if}
			</div>
		</EditSection>

		<!-- Description -->
		<EditSection title="Party Description" icon={FluentDocument20Filled}>
			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe your party's mission, values, and political platform..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				disabled={$submitting || !canEdit}
			></textarea>
		</EditSection>

		<!-- Submit -->
		<EditFormActions
			cancelHref="/party/{data.party.id}"
			{submitting}
			{delayed}
			disabled={!canEdit}
			editCost={data.editCost}
		/>

		<!-- Info Box -->
		<EditInfoBox editCost={data.editCost} cooldownHours={data.cooldownHours} />
	</form>
</EditPageLayout>
