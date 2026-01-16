<!-- src/lib/component/ShareButton.svelte -->
<script lang="ts">
	import FluentShareAndroid20Filled from "~icons/fluent/share-android-20-filled";
	import { shareLink } from "$lib/util";

	interface Props {
		title: string;
		url?: string;
		showLabel?: boolean;
		class?: string;
	}

	let { title, url, showLabel = true, class: className = "" }: Props = $props();
</script>

<button
	class="btn btn-sm gap-2 bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white transition-all {className}"
	onclick={() => shareLink(title, url)}
	title="Share"
>
	<FluentShareAndroid20Filled class="size-4" />
	{#if showLabel}
		<span class="hidden sm:inline">Share</span>
	{/if}
</button>
