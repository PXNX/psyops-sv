<!-- src/routes/(authenticated)/(dock)/state/[id]/ministry/[ministry]/+page.svelte -->
<!-- One ministry's desk: the office holder, the live figures they own and the
     state desks they administer. -->
<script lang="ts">
	import FluentChevronRight20Filled from "~icons/fluent/chevron-right-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import UserLink from "#lib/component/UserLink.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import { formatDate } from "#lib/utils/formatting.js";

	let { data } = $props();
</script>

<svelte:head><title>{data.spec.label} · {data.state.name} · PsyOps</title></svelte:head>

<PageContainer maxWidth="4xl">
	<PageHeader
		documentTitle={false}
		title="{data.spec.icon} {data.spec.label}"
		subtitle={data.state.name}
		backHref="/state/{data.state.id}/ministry"
		backLabel="All ministries"
	/>

	<section class="panel animate-rise-in rounded-sm p-5">
		<p class="text-sm text-fg-body">{data.spec.blurb}</p>
		<div class="mt-2 flex flex-wrap items-center gap-2">
			<Badge tone="neutral" size="xs">{data.portfolioLabel}</Badge>
			<Badge tone="primary" size="xs">{data.spec.label} Ministry</Badge>
		</div>

		<div class="mt-4 border-t border-line/15 pt-4">
			<p class="text-[10px] uppercase tracking-[0.2em] text-fg-muted">Office holder</p>
			<div class="mt-2">
				{#if data.holder}
					<UserLink
						id={data.holder.id}
						name={data.holder.name}
						avatar={data.holder.avatar}
						size="md"
						subtitle="Appointed {formatDate(data.holder.appointedAt)}"
					/>
				{:else}
					<span class="text-sm text-fg-faint">Vacant — no minister currently holds this office.</span>
				{/if}
			</div>
		</div>
	</section>

	<section class="panel animate-rise-in mt-4 rounded-sm p-5" style="--rise-delay: 100ms">
		<h2 class="section-title mb-3">Live figures</h2>
		<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each data.metrics as metric (metric.label)}
				<div class="panel-muted rounded-sm p-3">
					<dt class="text-[10px] uppercase tracking-wide text-fg-muted">{metric.label}</dt>
					<dd class="mt-0.5 font-mono text-lg font-bold text-fg">{metric.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	{#if data.tools.length}
		<section class="animate-rise-in mt-4" style="--rise-delay: 160ms">
			<h2 class="section-title mb-2">Desks</h2>
			<nav class="grid gap-2 sm:grid-cols-2" aria-label="{data.spec.label} tools">
				{#each data.tools as tool (tool.href)}
					<a href={tool.href} class="panel-interactive group flex items-center gap-3 rounded-sm p-3">
						<span class="flex-1 text-sm font-semibold text-fg group-hover:text-primary-fg">{tool.label}</span>
						<FluentChevronRight20Filled class="size-4 text-fg-muted" />
					</a>
				{/each}
			</nav>
		</section>
	{/if}
</PageContainer>
