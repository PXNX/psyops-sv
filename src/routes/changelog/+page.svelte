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

	/** Releases are labelled YYYY-MM-DD.build; split them for display. */
	const releaseLabel = (version: string) => {
		const match = version.match(/^(\d{4}-\d{2}-\d{2})\.(\d+)$/);
		return match ? { date: match[1]!, build: match[2]! } : null;
	};

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
							<h2 class="font-serif text-2xl text-heading">
								{releaseLabel(release.version)?.date ?? release.version}
							</h2>
							{#if releaseLabel(release.version)}
								<Badge tone="neutral" size="xs">build {releaseLabel(release.version)!.build}</Badge>
							{:else if release.date}
								<span class="font-mono text-xs text-fg-faint">{release.date}</span>
							{/if}
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
									<div class="ml-1 space-y-3 border-l-2 border-line/20 pl-4">
										{#each group.components as component (component.name)}
											<div>
												<div class="mb-1.5 flex items-center gap-2">
													<Badge tone={component.name === "General" ? "neutral" : "blue"} size="xs">{component.name}</Badge>
													<span class="text-[10px] uppercase tracking-[0.16em] text-fg-faint">scope</span>
													<span class="text-[10px] text-fg-faint">{component.items.length} {component.items.length === 1 ? "entry" : "entries"}</span>
												</div>
												<ul class="ml-1 space-y-1.5">
													{#each component.items as item}
														<li class="flex gap-2 text-sm leading-relaxed text-fg-soft">
															<span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"></span>
															<span>{item}</span>
														</li>
													{/each}
												</ul>
											</div>
										{/each}
									</div>
								</section>
							{/each}
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</PageContainer>
