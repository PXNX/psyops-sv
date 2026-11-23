<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import { Badge } from "#lib/component/ui/index.js";
	import FluentHistory20Filled from "~icons/fluent/history-20-filled";
	import FluentRocket20Filled from "~icons/fluent/rocket-20-filled";
	import FluentArrowSync20Filled from "~icons/fluent/arrow-sync-20-filled";
	import FluentWrench20Filled from "~icons/fluent/wrench-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const iconName = (type: string) =>
		type === "feature"
			? "rocket"
			: type === "change"
				? "sync"
				: type === "fix"
					? "wrench"
					: type === "security"
						? "shield"
						: type === "removal"
							? "delete"
							: "history";

	const accent = (type: string) =>
		type === "feature"
			? "text-positive-fg border-positive/30 bg-positive-bg/18"
			: type === "change"
				? "text-primary-fg border-primary/30 bg-primary/12"
				: type === "fix"
					? "text-warning border-warning/30 bg-warning/12"
					: type === "security"
						? "text-error border-error/30 bg-error/12"
						: "text-fg-muted border-line/25 bg-surface-2";

	const tone = (type: string) =>
		type === "feature" ? "green" : type === "change" ? "blue" : type === "fix" ? "amber" : type === "security" ? "red" : "neutral";
</script>

<svelte:head>
	<title>Changelog – PsyOps</title>
</svelte:head>

<PageContainer maxWidth="4xl" class="py-10">
	<div class="animate-soft-in">
		<div class="flex items-start gap-3 border-b border-line/20 pb-5">
			<span class="flex size-12 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/12">
				<FluentHistory20Filled class="size-6 text-primary-fg" />
			</span>
			<div>
				<h1 class="font-serif text-3xl text-heading">Changelog</h1>
				<p class="mt-1 text-sm text-fg-soft">Every release, grouped by the kind of change — features, changes and fixes.</p>
			</div>
		</div>

		{#if data.releases.length === 0}
			<p class="py-10 text-center text-sm text-fg-muted">No changelog available.</p>
		{:else}
			<ol class="relative mt-8 ml-3 border-l border-line/20">
				{#each data.releases as release, i (release.version)}
					<li class="relative mb-10 ml-6">
						<span class="absolute -left-[31px] top-2 size-3 rounded-full ring-4 ring-surface-0 {i === 0 ? 'bg-primary' : 'bg-surface-9'}"></span>
						<div class="flex flex-wrap items-baseline gap-3">
							<h2 class="font-serif text-2xl text-heading">{release.version}</h2>
							{#if release.date}<span class="font-mono text-xs text-fg-faint">{release.date}</span>{/if}
							{#if i === 0}<Badge tone="green" size="xs">latest</Badge>{/if}
						</div>

						<div class="mt-4 space-y-4">
							{#each release.groups as group (group.title)}
								<section class="panel animate-soft-in rounded-sm p-4" style="--rise-delay: {Math.min(i * 3 + 1, 8) * 25}ms">
									<div class="mb-3 flex items-center gap-2">
										<span class="flex size-8 items-center justify-center rounded-sm border {accent(group.type)}">
											{#if iconName(group.type) === "rocket"}
												<FluentRocket20Filled class="size-4" />
											{:else if iconName(group.type) === "sync"}
												<FluentArrowSync20Filled class="size-4" />
											{:else if iconName(group.type) === "wrench"}
												<FluentWrench20Filled class="size-4" />
											{:else if iconName(group.type) === "shield"}
												<FluentShield20Filled class="size-4" />
											{:else if iconName(group.type) === "delete"}
												<FluentDelete20Filled class="size-4" />
											{:else}
												<FluentHistory20Filled class="size-4" />
											{/if}
										</span>
										<h3 class="section-title text-base">{group.title}</h3>
										<Badge tone={tone(group.type)} size="xs">{group.type}</Badge>
										<span class="ml-auto text-[11px] text-fg-faint">{group.components.reduce((n, c) => n + c.items.length, 0)} entries</span>
									</div>
									<ul class="space-y-2">
										{#each group.components as component (component.name)}
											<li class="flex gap-2 text-sm leading-relaxed text-fg-soft">
												<span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"></span>
												<span>
													{#if component.name !== "General"}
														<Badge tone="neutral" size="xs">{component.name}</Badge>
														<span class="mx-1 text-fg-faint">—</span>
													{/if}
													{#each component.items as item, n}{#if n}<span class="text-fg-faint"> · </span>{/if}{item}{/each}
												</span>
											</li>
										{/each}
									</ul>
								</section>
							{/each}
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</PageContainer>
