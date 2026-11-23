<!-- src/routes/(authenticated)/(dock)/state/[id]/ministry/+page.svelte -->
<!-- The cabinet roster: every ministry, who holds it and the desks it runs. -->
<script lang="ts">
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

	let { data } = $props();
</script>

<svelte:head><title>Cabinet · {data.state.name} · PsyOps</title></svelte:head>

<PageContainer maxWidth="5xl">
	<PageHeader
		documentTitle={false}
		title="Ministries"
		subtitle={data.state.name}
		icon={FluentPeople20Filled}
		backHref="/state/{data.state.id}"
		backLabel={data.state.name}
	/>

	{#if data.president}
		<section class="panel animate-rise-in rounded-sm p-4">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Head of state</p>
			<div class="mt-2">
				<UserLink
					id={data.president.userId}
					name={data.president.name}
					avatar={data.president.avatar}
					size="md"
					subtitle="President · term {data.president.term} · since {formatDate(data.president.electedAt)}"
				/>
			</div>
		</section>
	{/if}

	<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.offices as office (office.ministry)}
			<a
				href="/state/{data.state.id}/ministry/{office.ministry}"
				class="panel-interactive animate-rise-in group flex flex-col rounded-sm p-4"
				style="--rise-delay: {40 * data.offices.indexOf(office)}ms"
			>
				<div class="flex items-start justify-between gap-2">
					<span class="text-2xl">{office.icon}</span>
					<Badge tone="neutral" size="xs">{office.portfolioLabel}</Badge>
				</div>
				<h2 class="mt-2 font-serif text-lg text-heading group-hover:text-primary-fg transition-colors">
					{office.label}
				</h2>
				<p class="mt-1 flex-1 text-xs text-fg-muted">{office.blurb}</p>
				<div class="mt-3 border-t border-line/15 pt-2">
					{#if office.holder}
						<UserLink
							id={office.holder.id}
							name={office.holder.name}
							avatar={office.holder.avatar}
							size="xs"
							subtitle="since {formatDate(office.holder.appointedAt)}"
						/>
					{:else}
						<span class="text-xs text-fg-faint">Vacant — no minister appointed</span>
					{/if}
				</div>
			</a>
		{/each}
	</div>
</PageContainer>
