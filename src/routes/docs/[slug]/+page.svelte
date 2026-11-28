<script lang="ts">
	import Seo from "#lib/component/Seo.svelte";

	const { data } = $props();

	const Content = $derived(data.component);
</script>

<Seo
	title="{data.meta.title} · PsyOps"
	description={data.meta.description || `Guide to ${data.meta.title} in PsyOps.`}
	type="article"
/>
<Content />
