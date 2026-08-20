<!-- src/lib/component/ui/IconButton.svelte -->
<script lang="ts">
	import type { Component } from "svelte";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { buttonClass, type ButtonSize, type ButtonVariant } from "./styles";

	interface Props extends Omit<HTMLButtonAttributes & HTMLAnchorAttributes, "class"> {
		/** The icon to render. */
		icon: Component;
		/** Required — icon-only controls need an accessible name. */
		label: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		shape?: "circle" | "square";
		href?: string;
		loading?: boolean;
		class?: string;
	}

	let {
		icon: Icon,
		label,
		variant = "ghost",
		size = "md",
		shape = "circle",
		href,
		loading = false,
		disabled = false,
		class: className = "",
		...rest
	}: Props = $props();

	const classes = $derived(buttonClass({ variant, size, shape, class: className }));
	const iconSize = $derived(size === "xs" ? "size-4" : size === "lg" ? "size-6" : "size-5");
	const spinnerSize = $derived(size === "xs" || size === "sm" ? "loading-xs" : "loading-sm");
</script>

{#if href}
	<a
		{...rest}
		{href}
		class={classes}
		class:btn-disabled={disabled || loading}
		aria-label={label}
		title={label}
		aria-disabled={disabled || loading ? "true" : undefined}
		tabindex={disabled || loading ? -1 : undefined}
	>
		{#if loading}
			<span class="loading loading-spinner {spinnerSize}"></span>
		{:else}
			<Icon class={iconSize} />
		{/if}
	</a>
{:else}
	<button {...rest} class={classes} disabled={disabled || loading} aria-label={label} title={label}>
		{#if loading}
			<span class="loading loading-spinner {spinnerSize}"></span>
		{:else}
			<Icon class={iconSize} />
		{/if}
	</button>
{/if}
