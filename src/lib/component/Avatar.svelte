<script lang="ts">
	export let image_url: string;

	/**
	 * todo: Newspaper with rounded corners, user as circle avatar.
	 *Also support loading a placeholder instead of an image if the image_url is None
	 * or if the user doesn't want to load pictures
	 */
</script>

<img alt="Avatar" class="rounded-lg w-14 h-14" loading="lazy" src={image_url} />
