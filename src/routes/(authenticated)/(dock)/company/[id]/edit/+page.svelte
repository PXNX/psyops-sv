<!-- src/routes/company/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import { editCompanySchema } from "./schema";
	import { useImageUpload } from "$lib/utils/edit/useImageUpload.svelte";
	import {
		EditPageLayout,
		EditSection,
		EditImageUpload,
		EditCooldownWarning,
		EditInsufficientFundsWarning,
		EditMessage,
		EditFormActions,
		EditInfoBox,
		EditStatCard
	} from "$lib/component/edit";
	import FluentBuilding20Filled from "~icons/fluent/building-20-filled";
	import FluentImage20Filled from "~icons/fluent/image-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import FluentFactory20Filled from "~icons/fluent/building-factory-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import ResourceRequirements from "$lib/component/ResourceRequirements.svelte";

	let { data } = $props();

	const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
		validators: valibotClient(editCompanySchema),
		multipleSubmits: "prevent",
		clearOnSubmit: "none",
		taintedMessage: null
	});

	// Image upload handling
	const imageUpload = useImageUpload(data.company.logoUrl);

	$effect(() => {
		return () => imageUpload.cleanup(data.company.logoUrl);
	});

	const canEdit = $derived(!data.isOnCooldown && data.canAfford);
</script>

<EditPageLayout title="Edit Company" subtitle={data.company.name} backHref="/company/{data.company.id}">
	{#snippet stats()}
		<div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
			<EditStatCard label="Factories" value={data.company.factoryCount} icon={FluentFactory20Filled} color="purple" />
			<EditStatCard label="Workers" value={data.company.workerCount} icon={FluentPeople20Filled} color="blue" />
		</div>
	{/snippet}

	<!-- Cooldown Warning -->
	{#if data.isOnCooldown && data.cooldownEndsAt}
		<EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="company" />
	{/if}

	<!-- Insufficient Funds Warning -->
	{#if !data.canAfford && !data.isOnCooldown}
		<EditInsufficientFundsWarning editCost={data.editCost} userBalance={data.userBalance} />
	{/if}

	<!-- Messages -->
	<EditMessage message={$message} />

	<!-- Form -->
	<form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-6">
		<!-- Company Name -->
		<EditSection title="Company Details" icon={FluentBuilding20Filled}>
			<div>
				<label for="name" class="block text-sm font-medium text-gray-300 mb-2">
					Company Name <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={$form.name}
					placeholder="e.g., Acme Industrial Corp"
					maxlength="50"
					class="input w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
					class:input-error={$errors.name}
					disabled={$submitting || !canEdit}
				/>
				{#if $errors.name}
					<p class="text-xs text-red-400 mt-1">{$errors.name}</p>
				{:else}
					<p class="text-xs text-gray-400 mt-1">{$form.name?.length || 0}/50 characters</p>
				{/if}
			</div>
		</EditSection>

		<!-- Company Logo -->
		<EditSection title="Company Logo" icon={FluentImage20Filled}>
			<EditImageUpload
				bind:previewUrl={imageUpload.previewUrl}
				bind:dragActive={imageUpload.dragActive}
				bind:fileInputElement={imageUpload.fileInput}
				disabled={$submitting || !canEdit}
				error={$errors.logo}
				entityName="company logo"
				file={imageUpload.currentFile}
				onFileSelect={(e) => {
					imageUpload.handleFileSelect(e, data.company.logoUrl);
					$form.logo = imageUpload.currentFile;
				}}
				onDrop={(e) => {
					imageUpload.handleDrop(e, data.company.logoUrl);
					$form.logo = imageUpload.currentFile;
				}}
				onDragOver={imageUpload.handleDragOver}
				onDragLeave={imageUpload.handleDragLeave}
				onClearImage={() => {
					imageUpload.clearImage(data.company.logoUrl);
					$form.logo = undefined;
				}}
				onClickUpload={() => imageUpload.fileInput?.click()}
			/>
		</EditSection>

		<!-- Logo Preview -->
		{#if imageUpload.previewUrl}
			<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5">
				<h3 class="text-sm font-semibold text-gray-300 mb-3">Preview</h3>
				<div class="bg-gradient-to-br from-purple-600/40 to-blue-600/20 rounded-lg p-6">
					<div class="flex items-center gap-4">
						<div class="size-16 rounded-xl bg-slate-800 border-2 border-white/10 flex items-center justify-center">
							<img src={imageUpload.previewUrl} alt="Logo preview" class="size-14 object-contain" />
						</div>
						<div>
							<p class="font-bold text-white text-xl">{$form.name || "Your Company Name"}</p>
							<p class="text-sm text-gray-300">Founded {new Date(data.company.foundedAt).toLocaleDateString()}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Description -->
		<EditSection title="Company Description" icon={FluentDocument20Filled}>
			<textarea
				id="description"
				name="description"
				bind:value={$form.description}
				rows="6"
				placeholder="Describe your company's mission, industry, and operations..."
				class="textarea w-full bg-slate-700/50 border-slate-600/30 text-white placeholder:text-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
				disabled={$submitting || !canEdit}
			></textarea>
			{#if $errors.description}
				<p class="text-xs text-red-400">{$errors.description}</p>
			{/if}
		</EditSection>

		<!-- Resource Requirements -->
		<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-2">
			<ResourceRequirements costs={{ currency: data.editCost }} available={{ currency: data.userBalance }} />
			<EditFormActions
				cancelHref="/company/{data.company.id}"
				{submitting}
				{delayed}
				disabled={!canEdit}
			/>
		</div>

		<!-- Info Box -->
		<EditInfoBox editCost={data.editCost} cooldownHours={data.cooldownHours} />
	</form>
</EditPageLayout>
