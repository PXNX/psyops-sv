<!-- src/lib/component/ui/FormActions.svelte -->
<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import Button from "./Button.svelte";
	import type { ButtonVariant } from "./styles";

	interface Props {
		/** Label of the confirming action. */
		submitLabel?: string;
		/** Shown in place of `submitLabel` while `submitting` is true. */
		submittingLabel?: string;
		submitVariant?: ButtonVariant;
		submitIcon?: Component;
		/** `submit` posts the surrounding form; pass `button` plus `onSubmit` otherwise. */
		submitType?: "submit" | "button";
		onSubmit?: () => void;
		submitDisabled?: boolean;
		submitting?: boolean;

		cancelLabel?: string;
		/** Renders the cancel action as a link instead of a button. */
		cancelHref?: string;
		onCancel?: () => void;

		/** Extra actions rendered before the cancel/submit pair. */
		extra?: Snippet;
		class?: string;
	}

	let {
		submitLabel = "Save",
		submittingLabel,
		submitVariant = "primary",
		submitIcon,
		submitType = "submit",
		onSubmit,
		submitDisabled = false,
		submitting = false,
		cancelLabel = "Cancel",
		cancelHref,
		onCancel,
		extra,
		class: className = ""
	}: Props = $props();
</script>

<div class="flex gap-3 pt-2 {className}">
	{#if extra}
		{@render extra()}
	{/if}
	{#if cancelHref}
		<Button href={cancelHref} variant="secondary" grow disabled={submitting}>{cancelLabel}</Button>
	{:else}
		<Button type="button" variant="secondary" grow onclick={onCancel} disabled={submitting}>
			{cancelLabel}
		</Button>
	{/if}
	<Button
		type={submitType}
		variant={submitVariant}
		icon={submitIcon}
		grow
		onclick={onSubmit}
		disabled={submitDisabled}
		loading={submitting}
		loadingText={submittingLabel}
	>
		{submitLabel}
	</Button>
</div>
