<!-- src/routes/(authenticated)/(dock)/newspaper/[id]/staff/+page.svelte -->
<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import EmptyState from "#lib/component/EmptyState.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";

	let { data } = $props();

	const roleTone = { owner: "blue", editor: "purple", author: "neutral" } as const;
	const roleLabel = { owner: "Publisher", editor: "Editor", author: "Writer" } as const;
</script>

<PageContainer maxWidth="3xl">
	<PageHeader
		title="Staff"
		documentTitle="Staff · {data.newspaper.name}"
		backHref="/newspaper/{data.newspaper.id}"
		backLabel={data.newspaper.name}
	/>

	{#if data.staff.length === 0}
		<EmptyState icon={FluentPeople20Filled} title="No staff yet" />
	{:else}
		<ul class="panel rounded-sm divide-y divide-white/[0.06] overflow-hidden">
			{#each data.staff as member (member.id)}
				<li class="flex items-center gap-3 px-3 sm:px-4 py-2.5 min-w-0">
					<UserLink id={member.id} name={member.name} avatar={member.logoUrl} class="flex-1" />
					<Badge tone={roleTone[member.role]} size="xs" class="shrink-0">{roleLabel[member.role]}</Badge>
				</li>
			{/each}
		</ul>
	{/if}
</PageContainer>
