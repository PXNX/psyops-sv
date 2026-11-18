<!-- src/routes/(authenticated)/(dock)/posts/+page.svelte -->
<script lang="ts">
	import PostFeed from "#lib/component/press/PostFeed.svelte";

	const { data } = $props();
</script>

<PostFeed {data} />
