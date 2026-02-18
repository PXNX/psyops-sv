# Migration Guide: Converting to New Edit Components

## Quick Start

### Before (Old Pattern)

```svelte
<!-- 500+ lines of repetitive code -->
<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <a href="/back">←</a>
      <h1>Edit Entity</h1>
    </div>
  </div>
  
  <!-- Cooldown warning (50+ lines) -->
  {#if onCooldown}
    <div class="bg-red-600/20 border...">
      <!-- Complex time calculation -->
    </div>
  {/if}
  
  <!-- Image upload (100+ lines) -->
  <div class="bg-slate-800/50...">
    <input type="file"... />
    <!-- Drag & drop logic -->
    <!-- Preview logic -->
    <!-- Cleanup logic -->
  </div>
  
  <!-- Color picker (80+ lines) -->
  <!-- More repetitive sections... -->
</div>
```

### After (New Pattern)

```svelte
<!-- 150-200 lines of clean, reusable code -->
<script lang="ts">
  import { useImageUpload } from "$lib/utils/edit/useImageUpload.svelte";
  import {
    EditPageLayout,
    EditSection,
    EditImageUpload,
    EditColorPicker,
    EditCooldownWarning,
    EditMessage,
    EditFormActions,
    EditInfoBox
  } from "$lib/component/edit";
  
  const imageUpload = useImageUpload(data.entity.logoUrl);
  $effect(() => () => imageUpload.cleanup(data.entity.logoUrl));
</script>

<EditPageLayout title="Edit Entity" subtitle={data.entity.name} backHref="/entity/{id}">
  <EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="entity" />
  <EditMessage message={$message} />
  
  <form use:enhance>
    <EditSection title="Logo" icon={Icon}>
      <EditImageUpload {...imageUploadProps} />
    </EditSection>
    
    <EditSection title="Color" icon={ColorIcon}>
      <EditColorPicker bind:color={$form.color} {...colorProps} />
    </EditSection>
    
    <EditFormActions cancelHref="/back" {submitting} {delayed} disabled={!canEdit} />
    <EditInfoBox editCost={1000} cooldownHours={24} />
  </form>
</EditPageLayout>
```

## Step-by-Step Migration

### Step 1: Add Imports

Replace your existing imports with:

```svelte
<script lang="ts">
  import { superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";
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
  // Your icons
  import FluentIcon from "~icons/fluent/...";
</script>
```

### Step 2: Setup Image Upload Hook

**Old way:**
```svelte
let previewUrl = $state<string | null>(data.entity.logoUrl);
let dragActive = $state(false);
let fileInput: HTMLInputElement;

function handleFileSelect(event: Event) {
  // 20+ lines of logic
}

function handleDrop(event: DragEvent) {
  // 15+ lines of logic
}

// More handlers...

$effect(() => {
  return () => {
    // Cleanup logic
  };
});
```

**New way:**
```svelte
const imageUpload = useImageUpload(data.entity.logoUrl);

$effect(() => {
  return () => imageUpload.cleanup(data.entity.logoUrl);
});
```

### Step 3: Replace Layout Wrapper

**Old way:**
```svelte
<div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <a href="/back" class="btn...">←</a>
      <div>
        <h1 class="text-3xl font-bold text-white">Edit Entity</h1>
        <p class="text-gray-400">{data.entity.name}</p>
      </div>
    </div>
  </div>
  
  <!-- Stats -->
  <div class="grid grid-cols-2 gap-4">
    <div class="bg-slate-800/50...">
      <!-- Stat card content -->
    </div>
  </div>
  
  <!-- Rest of content -->
</div>
```

**New way:**
```svelte
<EditPageLayout title="Edit Entity" subtitle={data.entity.name} backHref="/entity/{id}">
  {#snippet stats()}
    <div class="grid grid-cols-2 gap-4">
      <EditStatCard label="Stat 1" value={100} icon={Icon1} color="green" />
      <EditStatCard label="Stat 2" value={200} icon={Icon2} color="purple" />
    </div>
  {/snippet}
  
  <!-- Rest of content -->
</EditPageLayout>
```

### Step 4: Replace Warning Messages

**Old way:**
```svelte
{#if data.isOnCooldown && data.cooldownEndsAt}
  <div class="bg-red-600/20 border border-red-500/30 rounded-xl p-5 space-y-3">
    <div class="flex items-start gap-3">
      <FluentClock20Filled class="size-6 text-red-400..." />
      <div class="space-y-2 flex-1">
        <h3 class="font-semibold text-red-300 text-lg">Edit Cooldown Active</h3>
        <p class="text-red-200/90 text-sm...">
          This entity was recently edited...
        </p>
        <div class="bg-red-900/30 rounded-lg p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span>Time Remaining:</span>
            <span>{formatTimeRemaining(data.cooldownEndsAt)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if !data.canAfford}
  <!-- 30+ more lines for insufficient funds warning -->
{/if}
```

**New way:**
```svelte
{#if data.isOnCooldown && data.cooldownEndsAt}
  <EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="entity" />
{/if}

{#if !data.canAfford && !data.isOnCooldown}
  <EditInsufficientFundsWarning editCost={data.editCost} userBalance={data.userBalance} />
{/if}
```

### Step 5: Replace Success/Error Messages

**Old way:**
```svelte
{#if $message && !$message.includes("error")}
  <div class="bg-green-600/20 border border-green-500/30 rounded-xl p-4">
    <p class="text-green-300 text-sm font-medium">{$message}</p>
  </div>
{/if}

{#if $message && $message.includes("error")}
  <div class="bg-red-600/20 border border-red-500/30 rounded-xl p-4">
    <p class="text-red-300 text-sm font-medium">{$message}</p>
  </div>
{/if}
```

**New way:**
```svelte
<EditMessage message={$message} />
```

### Step 6: Replace Form Sections

**Old way:**
```svelte
<div class="bg-slate-800/50 rounded-xl border border-white/5 p-5 space-y-3">
  <div class="flex items-center gap-2">
    <FluentIcon class="size-5 text-purple-400" />
    <h2 class="text-lg font-semibold text-white">Section Title</h2>
  </div>
  
  <!-- Section content -->
</div>
```

**New way:**
```svelte
<EditSection title="Section Title" icon={FluentIcon}>
  <!-- Section content -->
</EditSection>
```

### Step 7: Replace Image Upload

**Old way:**
```svelte
<div class="relative" ondrop={handleDrop} ondragover={handleDragOver}...>
  <input
    bind:this={fileInput}
    type="file"
    class="hidden"
    onchange={handleFileSelect}
    disabled={$submitting}
  />
  
  <button type="button" onclick={() => fileInput?.click()}>
    {#if !previewUrl}
      <!-- 30+ lines for upload UI -->
    {:else}
      <!-- 40+ lines for preview UI -->
    {/if}
  </button>
</div>

{#if $errors.logo}
  <p class="text-xs text-red-400">{$errors.logo}</p>
{/if}
```

**New way:**
```svelte
<EditImageUpload
  bind:previewUrl={imageUpload.previewUrl}
  bind:dragActive={imageUpload.dragActive}
  bind:fileInputElement={imageUpload.fileInput}
  disabled={$submitting || !canEdit}
  error={$errors.logo}
  entityName="entity logo"
  file={imageUpload.currentFile}
  onFileSelect={(e) => {
    imageUpload.handleFileSelect(e, data.entity.logoUrl);
    $form.logo = imageUpload.currentFile;
  }}
  onDrop={(e) => {
    imageUpload.handleDrop(e, data.entity.logoUrl);
    $form.logo = imageUpload.currentFile;
  }}
  onDragOver={imageUpload.handleDragOver}
  onDragLeave={imageUpload.handleDragLeave}
  onClearImage={() => {
    imageUpload.clearImage(data.entity.logoUrl);
    $form.logo = undefined;
  }}
  onClickUpload={() => imageUpload.fileInput?.click()}
/>
```

### Step 8: Replace Color Picker

**Old way:**
```svelte
<div class="grid grid-cols-10 gap-2">
  {#each colorPresets as color}
    <button
      type="button"
      class="size-12 rounded-lg..."
      style="background: {color.value}"
      class:ring-4={$form.color === color.value}
      onclick={() => ($form.color = color.value)}
      disabled={$submitting}
    />
  {/each}
</div>

<div class="flex items-center gap-3">
  <label for="color">Custom:</label>
  <input type="color" bind:value={$form.color} />
</div>

<!-- 30+ lines for preview -->
```

**New way:**
```svelte
<EditColorPicker
  bind:color={$form.color}
  disabled={$submitting || !canEdit}
  error={$errors.color}
  previewIcon={FluentPeople20Filled}
  previewTitle={$form.name || "Preview Title"}
  previewSubtitle={$form.subtitle || "Subtitle"}
  previewImageUrl={imageUpload.previewUrl}
/>
```

### Step 9: Replace Form Actions

**Old way:**
```svelte
<div class="flex gap-3">
  <a
    href="/entity/{id}"
    class="btn flex-1 bg-slate-700/50 hover:bg-slate-600/50..."
    class:btn-disabled={$submitting}
  >
    Cancel
  </a>
  <button
    type="submit"
    disabled={$submitting || !canEdit}
    class="btn flex-1 bg-gradient-to-r from-purple-600..."
  >
    {#if $delayed}
      <span class="loading loading-spinner loading-sm"></span>
      Saving...
    {:else}
      <FluentCheckmark20Filled class="size-5" />
      Save Changes ({data.editCost.toLocaleString()})
    {/if}
  </button>
</div>
```

**New way:**
```svelte
<EditFormActions
  cancelHref="/entity/{data.entity.id}"
  submitting={$submitting}
  delayed={$delayed}
  disabled={!canEdit}
  editCost={data.editCost}
/>
```

### Step 10: Replace Info Box

**Old way:**
```svelte
<div class="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4">
  <p class="text-sm text-blue-300">
    💡 <strong>Note:</strong> Changes cost {data.editCost.toLocaleString()} currency 
    and have a {data.cooldownHours}-hour cooldown to prevent frequent modifications.
  </p>
</div>
```

**New way:**
```svelte
<EditInfoBox editCost={data.editCost} cooldownHours={data.cooldownHours} />
<!-- or with custom message -->
<EditInfoBox message="Your custom information message here" />
```

## Complete Example

Here's a full before/after comparison:

### Before: 500+ lines

```svelte
<!-- See old party/[id]/edit/+page.svelte for reference -->
<!-- Lots of duplicated code, inline styling, complex logic -->
```

### After: ~200 lines

```svelte
<script lang="ts">
  import { superForm } from "sveltekit-superforms";
  import { valibotClient } from "sveltekit-superforms/adapters";
  import { schema } from "./schema";
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
  import FluentIcon from "~icons/fluent/icon-20-filled";

  let { data } = $props();

  const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
    validators: valibotClient(schema),
    multipleSubmits: "prevent",
    clearOnSubmit: "none",
    taintedMessage: null
  });

  const imageUpload = useImageUpload(data.entity.logoUrl);
  $effect(() => () => imageUpload.cleanup(data.entity.logoUrl));

  const canEdit = $derived(!data.isOnCooldown && data.canAfford);
</script>

<EditPageLayout title="Edit Entity" subtitle={data.entity.name} backHref="/entity/{data.entity.id}">
  {#snippet stats()}
    <div class="grid grid-cols-2 gap-4">
      <EditStatCard label="Your Balance" value={data.userBalance} icon={MoneyIcon} color="green" />
      <EditStatCard label="Edit Cost" value={data.editCost} icon={CostIcon} color="purple" />
    </div>
  {/snippet}

  {#if data.isOnCooldown && data.cooldownEndsAt}
    <EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="entity" />
  {/if}

  {#if !data.canAfford && !data.isOnCooldown}
    <EditInsufficientFundsWarning editCost={data.editCost} userBalance={data.userBalance} />
  {/if}

  <EditMessage message={$message} />

  <form method="POST" action="?/update" enctype="multipart/form-data" use:enhance class="space-y-6">
    <EditSection title="Details" icon={FluentIcon}>
      <label>
        Name <span class="text-red-400">*</span>
        <input
          type="text"
          bind:value={$form.name}
          class="input w-full..."
          class:input-error={$errors.name}
          disabled={$submitting || !canEdit}
        />
        {#if $errors.name}
          <p class="text-xs text-red-400">{$errors.name}</p>
        {/if}
      </label>
    </EditSection>

    <EditSection title="Logo" icon={ImageIcon}>
      <EditImageUpload
        bind:previewUrl={imageUpload.previewUrl}
        bind:dragActive={imageUpload.dragActive}
        bind:fileInputElement={imageUpload.fileInput}
        disabled={$submitting || !canEdit}
        error={$errors.logo}
        entityName="entity logo"
        file={imageUpload.currentFile}
        onFileSelect={(e) => {
          imageUpload.handleFileSelect(e, data.entity.logoUrl);
          $form.logo = imageUpload.currentFile;
        }}
        onDrop={(e) => {
          imageUpload.handleDrop(e, data.entity.logoUrl);
          $form.logo = imageUpload.currentFile;
        }}
        onDragOver={imageUpload.handleDragOver}
        onDragLeave={imageUpload.handleDragLeave}
        onClearImage={() => {
          imageUpload.clearImage(data.entity.logoUrl);
          $form.logo = undefined;
        }}
        onClickUpload={() => imageUpload.fileInput?.click()}
      />
    </EditSection>

    <EditSection title="Color" icon={ColorIcon}>
      <EditColorPicker
        bind:color={$form.color}
        disabled={$submitting || !canEdit}
        error={$errors.color}
        previewIcon={PreviewIcon}
        previewTitle={$form.name || "Preview"}
        previewSubtitle="Subtitle"
        previewImageUrl={imageUpload.previewUrl}
      />
    </EditSection>

    <EditFormActions
      cancelHref="/entity/{data.entity.id}"
      submitting={$submitting}
      delayed={$delayed}
      disabled={!canEdit}
      editCost={data.editCost}
    />

    <EditInfoBox editCost={data.editCost} cooldownHours={data.cooldownHours} />
  </form>
</EditPageLayout>
```

## Common Pitfalls

### 1. Forgetting Cleanup

❌ **Wrong:**
```svelte
const imageUpload = useImageUpload(data.logoUrl);
// No cleanup - memory leak!
```

✅ **Correct:**
```svelte
const imageUpload = useImageUpload(data.logoUrl);

$effect(() => {
  return () => imageUpload.cleanup(data.logoUrl);
});
```

### 2. Not Syncing File with Form

❌ **Wrong:**
```svelte
onFileSelect={(e) => {
  imageUpload.handleFileSelect(e, data.logoUrl);
  // Forgot to update $form.logo!
}}
```

✅ **Correct:**
```svelte
onFileSelect={(e) => {
  imageUpload.handleFileSelect(e, data.logoUrl);
  $form.logo = imageUpload.currentFile;
}}
```

### 3. Incorrect Disabled Logic

❌ **Wrong:**
```svelte
disabled={$submitting}
// Doesn't consider cooldown or balance!
```

✅ **Correct:**
```svelte
const canEdit = $derived(!data.isOnCooldown && data.canAfford);
// ...
disabled={$submitting || !canEdit}
```

### 4. Missing Error Attribute

❌ **Wrong:**
```svelte
<EditImageUpload ... />
<!-- No error prop - validation won't show! -->
```

✅ **Correct:**
```svelte
<EditImageUpload error={$errors.logo} ... />
```

## Testing Your Migration

After migrating, test these scenarios:

- [ ] Page loads with existing data
- [ ] Back button navigates correctly
- [ ] Stats display correct values
- [ ] Cooldown warning shows (if applicable)
- [ ] Insufficient funds warning shows (if applicable)
- [ ] Image upload via file select works
- [ ] Image upload via drag & drop works
- [ ] Image preview displays
- [ ] Clear image button works
- [ ] Color presets work
- [ ] Custom color picker works
- [ ] Preview updates in real-time
- [ ] Form validation shows errors
- [ ] Submit button shows loading state
- [ ] Cancel button works
- [ ] Form submits successfully
- [ ] Success message displays
- [ ] No console errors
- [ ] No memory leaks (check DevTools)

## Getting Help

If you run into issues:

1. Check the [README.md](./README.md) for component API reference
2. Look at refactored examples:
   - `party/[id]/edit/+page.svelte` (full-featured)
   - `company/[id]/edit/+page.svelte` (with preview)
   - `state/[id]/edit/+page.svelte` (simplified)
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for data flow
4. Ask the team in #frontend-help channel

## Next Steps

After successfully migrating one page:

1. Test thoroughly
2. Get code review
3. Deploy to staging
4. Migrate another page
5. Share learnings with team
