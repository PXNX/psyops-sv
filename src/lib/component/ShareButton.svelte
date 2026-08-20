<!-- src/lib/component/ShareButton.svelte -->
<script lang="ts">
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import { shareLink } from "$lib/util";
	import Button from "$lib/component/ui/Button.svelte";

	interface Props {
		title: string;
		url?: string;
		showLabel?: boolean;
		class?: string;
	}

	let { title, url, showLabel = true, class: className = "" }: Props = $props();
</script>

<Button
	variant="secondary"
	size="sm"
	icon={FluentShareAndroid20Filled}
	class={className}
	onclick={() => shareLink(title, url)}
>
	{#if showLabel}
		<span class="hidden sm:inline">Share</span>
	{/if}
</Button>
