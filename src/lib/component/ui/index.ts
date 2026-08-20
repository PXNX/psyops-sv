// src/lib/component/ui/index.ts
// Shared UI primitives. Import from here so every screen uses the same surfaces:
//   import { Button, IconButton, Badge } from "$lib/component/ui";
export { default as Button } from "./Button.svelte";
export { default as IconButton } from "./IconButton.svelte";
export { default as Badge } from "./Badge.svelte";
export { default as FormActions } from "./FormActions.svelte";
export { default as ActionListItem } from "./ActionListItem.svelte";
export { default as BackLink } from "./BackLink.svelte";
export { default as ToolbarButton } from "./ToolbarButton.svelte";
export { buttonClass, badgeClass } from "./styles";
export type { ButtonVariant, ButtonSize, ButtonShape, BadgeTone, BadgeSize } from "./styles";
