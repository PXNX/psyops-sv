<!-- src/lib/component/ui/Button.svelte -->
<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { buttonClass, type ButtonShape, type ButtonSize, type ButtonVariant } from "./styles";

	interface Props extends Omit<HTMLButtonAttributes & HTMLAnchorAttributes, "class"> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		shape?: ButtonShape;
		/** Renders an <a> instead of a <button>. */
		href?: string;
		/** Stretch to the full width of the parent. */
		block?: boolean;
		/** Share the row evenly with sibling buttons. */
		grow?: boolean;
		/** Shows a spinner and blocks interaction. */
		loading?: boolean;
		/** Replaces the label while loading. */
		loadingText?: string;
		/** Leading icon component (e.g. `~icons/fluent/save-20-filled`). */
		icon?: Component;
		/** Trailing icon component. */
		iconRight?: Component;
		class?: string;
		children?: Snippet;
	}

	let {
		variant = "primary",
		size = "md",
		shape = "default",
		href,
		block = false,
		grow = false,
		loading = false,
		loadingText,
		icon: Icon,
		iconRight: IconRight,
		class: className = "",
		disabled = false,
		children,
		...rest
	}: Props = $props();

	const classes = $derived(buttonClass({ variant, size, shape, block, grow, class: className }));
	const iconSize = $derived(size === "xs" ? "size-3.5" : size === "lg" ? "size-6" : "size-5");
	const spinnerSize = $derived(size === "xs" || size === "sm" ? "loading-xs" : "loading-sm");
</script>

{#snippet content()}
	{#if loading}
		<span class="loading loading-spinner {spinnerSize}"></span>
		{#if loadingText}{loadingText}{:else if children}{@render children()}{/if}
	{:else}
		{#if Icon}
			<Icon class={iconSize} />
		{/if}
		{#if children}{@render children()}{/if}
		{#if IconRight}
			<IconRight class={iconSize} />
		{/if}
	{/if}
{/snippet}

{#if href}
	<a
		{...rest}
		{href}
		class={classes}
		class:btn-disabled={disabled || loading}
		aria-disabled={disabled || loading ? "true" : undefined}
		tabindex={disabled || loading ? -1 : undefined}
	>
		{@render content()}
	</a>
{:else}
	<button {...rest} class={classes} disabled={disabled || loading}>
		{@render content()}
	</button>
{/if}
