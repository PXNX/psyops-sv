<script lang="ts">
	import FluentColorPeople20 from "~icons/fluent-color/people-24";

	const { src, bgColor }: { src: string; bgColor?: string } = $props();

	function replaceImg() {
		error = true;
	}

	let error = $state(false);

	/**
	 * todo: Newspaper with rounded corners, user as circle avatar.
	 *Also support loading a placeholder instead of an image if the image_url is None
	 * or if the user doesn't want to load pictures
	 */
</script>

{#if error}
	<FluentColorPeople20 class="rounded-lg w-14 h-14 bg-indigo-800 p-1" />
{:else}
	<img
		alt="Avatar"
		class={`rounded-lg w-14 h-14 ${bgColor} bg-cover bg-center`}
		loading="lazy"
		onerror={() => replaceImg()}
		{src}
		width="140"
	/>
{/if}
