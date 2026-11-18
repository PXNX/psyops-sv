<!-- src/routes/(authenticated)/(dock)/posts/subscribed/+page.svelte -->
<script lang="ts">
	import PostFeed from "#lib/component/press/PostFeed.svelte";

	const { data } = $props();
</script>

<PostFeed {data} subscribed />
