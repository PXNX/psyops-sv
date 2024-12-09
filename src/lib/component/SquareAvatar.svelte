<script lang="ts">
	export let image_url: string;

	import FluentColorPerson20 from "~icons/fluent-color/person-20";

	function replaceImg() {
		error = true;
	}

	let error = false;

	/**
	 * todo: Newspaper with rounded corners, user as circle avatar.
	 *Also support loading a placeholder instead of an image if the image_url is None
	 * or if the user doesn't want to load pictures
	 */
</script>

{#if error}
	<FluentColorPerson20 class="rounded-lg w-14 h-14 bg-indigo-800 p-1" />
{:else}
	<img
		alt="Avatar"
		class="rounded-lg w-14 h-14"
		loading="lazy"
		onerror={() => replaceImg()}
		src={image_url}
		width="140"
	/>
{/if}
