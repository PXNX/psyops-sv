<!-- src/routes/(authenticated)/(dock)/user/[id]/history/+page.svelte -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import HistoryTimeline from "#lib/component/HistoryTimeline.svelte";
	import type { PageData } from "./$types";
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>History of {data.title} – PsyOps</title>
</svelte:head>

<PageContainer>
	<PageHeader title="History" subtitle={data.title} backHref="/user/{data.id}" />
	<div class="panel animate-soft-in rounded-sm p-4">
		<HistoryTimeline entries={data.entries} />
	</div>
</PageContainer>
