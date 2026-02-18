# Edit Components Architecture

## Component Hierarchy

```
EditPageLayout (Root Container)
├── Header Section
│   ├── Back Button
│   ├── Title
│   └── Subtitle
│
├── Stats Section (Optional Snippet)
│   └── EditStatCard (0..n)
│       ├── Icon
│       └── Value Display
│
└── Content Section (Main Snippet)
    ├── Warnings (Conditional)
    │   ├── EditCooldownWarning
    │   │   ├── Icon (FluentClock)
    │   │   └── Time Calculation
    │   └── EditInsufficientFundsWarning
    │       ├── Icon (FluentMoney)
    │       └── Cost Calculation
    │
    ├── EditMessage (Success/Error)
    │
    └── Form
        ├── EditSection (1..n)
        │   ├── Icon + Title
        │   └── Content
        │       ├── Text Inputs
        │       ├── Textareas
        │       ├── Selects
        │       ├── EditImageUpload
        │       │   ├── File Input (hidden)
        │       │   ├── Drag & Drop Zone
        │       │   ├── Preview Image
        │       │   └── Clear Button
        │       └── EditColorPicker
        │           ├── Color Preset Grid
        │           ├── Custom Color Input
        │           └── Live Preview Card
        │
        ├── EditFormActions
        │   ├── Cancel Button
        │   └── Submit Button (with loading state)
        │
        └── EditInfoBox
            └── Informational Text
```

## Data Flow

### Image Upload Flow

```
User Action
    ↓
useImageUpload Hook
    ├── handleFileSelect() ────→ File Selected
    ├── handleDrop() ──────────→ File Dropped
    ├── handleDragOver() ──────→ Drag Active State
    └── handleDragLeave() ─────→ Drag Inactive State
    ↓
updatePreview()
    ├── Cleanup old blob URL
    ├── Create new blob URL
    └── Update previewUrl state
    ↓
EditImageUpload Component
    ├── Display preview
    └── Bind to form.$file
    ↓
Form Submission
    ↓
Server Processing
    ↓
$effect cleanup
    └── URL.revokeObjectURL()
```

### Color Picker Flow

```
User Interaction
    ├── Click Preset ──────────→ Set color value
    └── Custom Color Input ────→ Set color value
    ↓
Reactive $form.color binding
    ↓
Preview Card Update
    ├── Background color
    ├── Border color
    ├── Text color
    └── Icon/Image display
```

### Form State Flow

```
superForm Setup
    ├── $form (form values)
    ├── $errors (validation errors)
    ├── $message (success/error messages)
    ├── $submitting (submission state)
    └── $delayed (delayed submission)
    ↓
Component Props
    ├── disabled = $submitting || !canEdit
    └── error = $errors.fieldName
    ↓
User Input
    ↓
Validation (valibotClient)
    ├── Valid → Enable submit
    └── Invalid → Show errors
    ↓
Form Submit
    ├── Show loading state
    └── Disable inputs
    ↓
Server Response
    ├── Success → Show message, redirect
    └── Error → Show error message
```

## Component Communication

### Props Flow (Top-Down)

```
Page Component
    ├── data (from load function)
    │   ├── entity details
    │   ├── costs
    │   ├── cooldowns
    │   └── user balance
    │
    ├── $form (superForm state)
    ├── $errors (validation)
    └── $message (feedback)
    ↓
Edit Components
    ├── Receive via props
    └── Display/handle accordingly
```

### Events Flow (Bottom-Up)

```
EditImageUpload
    ├── onFileSelect ──────→ Parent handler
    ├── onDrop ────────────→ Parent handler
    ├── onClearImage ─────→ Parent handler
    └── onClickUpload ────→ Parent handler
    ↓
useImageUpload Hook
    ├── Process event
    ├── Update state
    └── Sync with $form
    ↓
Form State Updated
```

## State Management

### Local Component State

```typescript
// EditImageUpload
let dragActive = $state(false);
let fileInput = $state<HTMLInputElement>();
let previewUrl = $state<string | null>(null);
```

### Shared State (useImageUpload)

```typescript
const imageUpload = useImageUpload(initialUrl);
// Returns reactive state object with:
// - previewUrl
// - dragActive
// - fileInput
// - currentFile
// - handlers
```

### Form State (superForm)

```typescript
const { form, errors, message, enhance, submitting, delayed } = superForm(data.form, {
  validators: valibotClient(schema)
});
```

### Derived State

```typescript
const canEdit = $derived(!data.isOnCooldown && data.canAfford);
const isError = $derived(message?.includes("error"));
```

## Styling System

### Color Schemes

```
Backgrounds:
├── slate-800/50 (sections)
├── slate-700/50 (inputs)
└── slate-900/50 (image preview background)

Borders:
├── white/5 (section borders)
├── slate-600/30 (input borders)
└── purple-500/50 (focus borders)

Status Colors:
├── Green (success, balance)
├── Red (error, cooldown)
├── Amber (warning, insufficient funds)
├── Purple (primary actions)
└── Blue (info, secondary actions)
```

### Responsive Breakpoints

```
Mobile First:
├── Default: 1 column
├── sm: (640px) 2 columns for grids
└── lg: Max width 3xl (48rem)
```

## Accessibility Features

```
Keyboard Navigation:
├── Tab order follows visual order
├── Focus visible on all interactive elements
└── Enter submits form

Screen Readers:
├── Semantic HTML (form, label, input)
├── ARIA labels where needed
└── Error messages linked to inputs

Visual Feedback:
├── Hover states
├── Focus rings
├── Loading spinners
└── Disabled states
```

## Performance Considerations

### Image Upload

```
Memory Management:
├── URL.revokeObjectURL() in cleanup
├── Single preview URL at a time
└── Cleanup on component unmount

File Size:
├── 5MB max enforced
├── Client-side validation
└── Server-side conversion to WebP
```

### Component Rendering

```
Optimization:
├── Minimal re-renders (Svelte 5 runes)
├── Derived state for computed values
├── Event handlers are stable references
└── Conditional rendering for warnings
```

## Extension Points

### Adding New Field Types

```svelte
<!-- In EditSection -->
<EditSection title="..." icon={...}>
  <!-- Add any form field type -->
  <YourCustomInput ... />
</EditSection>
```

### Custom Validation Display

```svelte
<!-- Wrap with your own error display -->
{#if $errors.fieldName}
  <CustomError message={$errors.fieldName} />
{/if}
```

### Custom Actions

```svelte
<!-- Replace EditFormActions -->
<div class="flex gap-3">
  <button>Custom Action 1</button>
  <button>Custom Action 2</button>
  <EditFormActions ... />
</div>
```

## Testing Strategy

### Unit Tests (Component Level)

```typescript
// Test EditStatCard
- Renders label and value
- Applies correct color class
- Formats numbers with commas

// Test EditColorPicker
- Renders color presets
- Updates color on preset click
- Shows live preview
- Binds to parent state

// Test useImageUpload
- Handles file select
- Handles drag & drop
- Cleans up blob URLs
- Clears image correctly
```

### Integration Tests (Page Level)

```typescript
// Test party/[id]/edit page
- Loads with existing data
- Shows cooldown warning when active
- Shows insufficient funds warning when needed
- Uploads and previews image
- Updates color picker preview
- Submits form successfully
- Shows validation errors
```

### E2E Tests

```typescript
// Full user flow
- Navigate to edit page
- Upload new logo
- Change color
- Fill form fields
- Submit form
- Verify success message
- Verify entity updated
```

## Migration Path

### Phase 1: Core Components (✅ Complete)
- EditPageLayout
- EditSection
- EditMessage
- EditFormActions
- EditInfoBox

### Phase 2: Input Components (✅ Complete)
- EditImageUpload + useImageUpload
- EditColorPicker
- EditStatCard

### Phase 3: Warning Components (✅ Complete)
- EditCooldownWarning
- EditInsufficientFundsWarning

### Phase 4: Page Refactoring (✅ Complete)
- Party edit page
- Company edit page
- State edit page

### Phase 5: Future Pages (Pending)
- Bloc edit page
- Factory edit page
- Newspaper edit page
- Posts edit page
- User profile edit page

## Best Practices

1. **Always cleanup resources**
   ```svelte
   $effect(() => {
     return () => imageUpload.cleanup(originalUrl);
   });
   ```

2. **Use derived state for conditions**
   ```svelte
   const canEdit = $derived(!cooldown && hasBalance);
   ```

3. **Consistent error handling**
   ```svelte
   error={$errors.fieldName}
   ```

4. **Standardized disabled state**
   ```svelte
   disabled={$submitting || !canEdit}
   ```

5. **Type-safe props**
   ```typescript
   interface Props {
     required: string;
     optional?: number;
   }
   ```
