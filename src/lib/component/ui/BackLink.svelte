<!-- src/lib/component/ui/BackLink.svelte -->
<script lang="ts">
	import FluentArrowLeft20Filled from "~icons/fluent/arrow-left-20-filled";
	import IconButton from "./IconButton.svelte";
	import Button from "./Button.svelte";

	interface Props {
		href: string;
		/** With a label the control renders as a text button, otherwise as a round icon button. */
		label?: string;
		class?: string;
	}

	let { href, label, class: className = "" }: Props = $props();
</script>

{#if label}
	<Button {href} variant="ghost" size="sm" icon={FluentArrowLeft20Filled} class={className}>{label}</Button>
{:else}
	<IconButton {href} icon={FluentArrowLeft20Filled} label="Go back" variant="secondary" class={className} />
{/if}
