# Edit Page Components

A collection of reusable components for creating consistent edit pages across the application.

## Overview

These components provide a standardized UI for entity edit pages with:
- Consistent layout and styling
- Built-in validation feedback
- Cooldown and cost warnings
- Image upload with drag & drop
- Color pickers with previews
- Responsive design

## Components

### `EditPageLayout`

Main layout wrapper for edit pages.

```svelte
<EditPageLayout 
  title="Edit Party" 
  subtitle="Progressive Alliance" 
  backHref="/party/123"
>
  {#snippet stats()}
    <!-- Optional stats cards -->
  {/snippet}
  
  <!-- Main content -->
</EditPageLayout>
```

**Props:**
- `title: string` - Page title
- `subtitle?: string` - Optional subtitle (entity name)
- `backHref: string` - URL for back button
- `children: Snippet` - Main content
- `stats?: Snippet` - Optional stats section

---

### `EditSection`

Styled container for form sections.

```svelte
<EditSection title="Party Details" icon={FluentFlag20Filled}>
  <!-- Section content -->
</EditSection>
```

**Props:**
- `title: string` - Section heading
- `icon?: ComponentType` - Optional icon component
- `children: Snippet` - Section content

---

### `EditImageUpload`

Image upload with drag & drop, preview, and validation.

```svelte
<script>
  import { useImageUpload } from "$lib/utils/edit/useImageUpload.svelte";
  
  const imageUpload = useImageUpload(initialLogoUrl);
  
  $effect(() => {
    return () => imageUpload.cleanup(initialLogoUrl);
  });
</script>

<EditImageUpload
  bind:previewUrl={imageUpload.previewUrl}
  bind:dragActive={imageUpload.dragActive}
  bind:fileInputElement={imageUpload.fileInput}
  disabled={$submitting}
  error={$errors.logo}
  entityName="party logo"
  file={imageUpload.currentFile}
  onFileSelect={(e) => {
    imageUpload.handleFileSelect(e, initialLogoUrl);
    $form.logo = imageUpload.currentFile;
  }}
  onDrop={(e) => {
    imageUpload.handleDrop(e, initialLogoUrl);
    $form.logo = imageUpload.currentFile;
  }}
  onDragOver={imageUpload.handleDragOver}
  onDragLeave={imageUpload.handleDragLeave}
  onClearImage={() => {
    imageUpload.clearImage(initialLogoUrl);
    $form.logo = undefined;
  }}
  onClickUpload={() => imageUpload.fileInput?.click()}
/>
```

**Props:**
- `previewUrl: string | null` - Current preview URL
- `dragActive: boolean` - Drag state
- `fileInputElement: HTMLInputElement | undefined` - File input ref
- `disabled: boolean` - Disable interactions
- `error?: string` - Validation error message
- `entityName?: string` - Name of what's being uploaded (default: "logo")
- `file?: File` - Current file object
- `onFileSelect: (event: Event) => void` - File select handler
- `onDrop: (event: DragEvent) => void` - Drop handler
- `onDragOver: (event: DragEvent) => void` - Drag over handler
- `onDragLeave: () => void` - Drag leave handler
- `onClearImage: () => void` - Clear image handler
- `onClickUpload: () => void` - Click to upload handler

---

### `EditColorPicker`

Color picker with presets and live preview.

```svelte
<EditColorPicker
  bind:color={$form.color}
  disabled={$submitting}
  error={$errors.color}
  previewIcon={FluentPeople20Filled}
  previewTitle={$form.name || "Your Party Name"}
  previewSubtitle={$form.abbreviation || "Abbreviation"}
  previewImageUrl={imageUpload.previewUrl}
/>
```

**Props:**
- `color: string` - Current color (bindable)
- `disabled?: boolean` - Disable interactions
- `error?: string` - Validation error
- `previewIcon?: ComponentType` - Icon for preview
- `previewTitle?: string` - Title in preview
- `previewSubtitle?: string` - Subtitle in preview
- `previewImageUrl?: string | null` - Image URL for preview
- `colorPresets?: ColorPreset[]` - Custom color presets

---

### `EditCooldownWarning`

Displays cooldown information with time remaining.

```svelte
<EditCooldownWarning 
  cooldownEndsAt={data.cooldownEndsAt} 
  entityName="party" 
/>
```

**Props:**
- `cooldownEndsAt: string` - ISO date string
- `entityName?: string` - Name of entity (default: "this")

---

### `EditInsufficientFundsWarning`

Shows insufficient funds warning with details.

```svelte
<EditInsufficientFundsWarning 
  editCost={5000} 
  userBalance={2000} 
/>
```

**Props:**
- `editCost: number` - Required amount
- `userBalance: number` - User's current balance

---

### `EditMessage`

Displays success or error messages.

```svelte
<EditMessage message={$message} />
```

**Props:**
- `message: string | undefined` - Message to display

---

### `EditFormActions`

Submit and cancel buttons.

```svelte
<EditFormActions
  cancelHref="/party/123"
  submitting={$submitting}
  delayed={$delayed}
  disabled={!canEdit}
  editCost={5000}
/>
```

**Props:**
- `cancelHref: string` - Cancel button URL
- `submitting: boolean` - Form submitting state
- `delayed: boolean` - Delayed submission state
- `disabled: boolean` - Disable submit
- `editCost?: number` - Cost to display on button
- `submitLabel?: string` - Custom submit text (default: "Save Changes")

---

### `EditInfoBox`

Information box with notes about costs/cooldowns.

```svelte
<EditInfoBox 
  editCost={5000} 
  cooldownHours={1} 
/>
<!-- or -->
<EditInfoBox 
  message="Custom information message" 
/>
```

**Props:**
- `editCost?: number` - Edit cost
- `cooldownHours?: number` - Cooldown duration
- `message?: string` - Custom message (overrides auto-generated)

---

### `EditStatCard`

Stat display card with icon.

```svelte
<EditStatCard 
  label="Your Balance" 
  value={10000} 
  icon={FluentMoney20Filled} 
  color="green" 
/>
```

**Props:**
- `label: string` - Stat label
- `value: string | number` - Stat value
- `icon: ComponentType` - Icon component
- `color?: "green" | "purple" | "blue" | "red" | "amber"` - Color theme

---

## Utilities

### `useImageUpload`

Composable for managing image upload state.

```svelte
<script lang="ts">
  import { useImageUpload } from "$lib/utils/edit/useImageUpload.svelte";
  
  const imageUpload = useImageUpload(data.initialLogoUrl);
  
  // Cleanup on unmount
  $effect(() => {
    return () => imageUpload.cleanup(data.initialLogoUrl);
  });
</script>
```

**Returns:**
- `previewUrl: string | null` - Current preview URL
- `dragActive: boolean` - Is drag active
- `fileInput: HTMLInputElement | undefined` - File input element
- `currentFile: File | undefined` - Current file
- `handleFileSelect: (event, originalUrl) => void`
- `handleDrop: (event, originalUrl) => void`
- `handleDragOver: (event) => void`
- `handleDragLeave: () => void`
- `clearImage: (originalUrl) => void`
- `cleanup: (originalUrl) => void`

---

## Example Usage

Complete example of an edit page:

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
  
  let { data } = $props();
  
  const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
    validators: valibotClient(schema)
  });
  
  const imageUpload = useImageUpload(data.entity.logoUrl);
  
  $effect(() => {
    return () => imageUpload.cleanup(data.entity.logoUrl);
  });
  
  const canEdit = $derived(!data.isOnCooldown && data.canAfford);
</script>

<EditPageLayout title="Edit Entity" subtitle={data.entity.name} backHref="/entity/{data.entity.id}">
  {#snippet stats()}
    <EditStatCard label="Balance" value={data.balance} icon={MoneyIcon} color="green" />
    <EditStatCard label="Cost" value={data.cost} icon={CostIcon} color="purple" />
  {/snippet}
  
  {#if data.isOnCooldown}
    <EditCooldownWarning cooldownEndsAt={data.cooldownEndsAt} entityName="entity" />
  {/if}
  
  {#if !data.canAfford}
    <EditInsufficientFundsWarning editCost={data.cost} userBalance={data.balance} />
  {/if}
  
  <EditMessage message={$message} />
  
  <form method="POST" use:enhance class="space-y-6">
    <EditSection title="Details" icon={Icon}>
      <!-- Form fields -->
    </EditSection>
    
    <EditSection title="Logo" icon={ImageIcon}>
      <EditImageUpload {...imageUploadProps} />
    </EditSection>
    
    <EditSection title="Color" icon={ColorIcon}>
      <EditColorPicker bind:color={$form.color} {...colorProps} />
    </EditSection>
    
    <EditFormActions
      cancelHref="/entity/{data.entity.id}"
      submitting={$submitting}
      delayed={$delayed}
      disabled={!canEdit}
      editCost={data.cost}
    />
    
    <EditInfoBox editCost={data.cost} cooldownHours={24} />
  </form>
</EditPageLayout>
```

## Styling

All components use:
- Tailwind CSS classes
- DaisyUI components
- Consistent color scheme (slate background, purple/blue accents)
- Responsive design (mobile-first)

## Best Practices

1. **Always cleanup image uploads**:
   ```svelte
   $effect(() => {
     return () => imageUpload.cleanup(originalUrl);
   });
   ```

2. **Use derived canEdit state**:
   ```svelte
   const canEdit = $derived(!data.isOnCooldown && data.canAfford);
   ```

3. **Show warnings before form**:
   - Cooldown warning
   - Insufficient funds warning
   - Messages

4. **Use consistent structure**:
   - Layout wrapper
   - Stats (optional)
   - Warnings
   - Messages
   - Form sections
   - Actions
   - Info box
