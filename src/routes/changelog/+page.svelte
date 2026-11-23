<script lang="ts">
	import PageContainer from "#lib/component/PageContainer.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	/** Releases are labelled YYYY-MM-DD.build. */
	const parts = (version: string) => {
		const match = version.match(/^(\d{4}-\d{2}-\d{2})\.(\d+)$/);
		return match ? { date: match[1]!, build: match[2]! } : { date: version, build: null };
	};
</script>

<svelte:head>
	<title>Changelog – PsyOps</title>
</svelte:head>

<PageContainer maxWidth="3xl" class="py-12">
	<div class="animate-soft-in">
		<h1 class="font-serif text-3xl text-heading">Changelog</h1>
		<p class="mt-1 text-sm text-fg-muted">New features and fixes, grouped by release.</p>

		{#if data.releases.length === 0}
			<p class="mt-8 text-sm text-fg-muted">No changelog available.</p>
		{:else}
			<div class="mt-10 space-y-12">
				{#each data.releases as release, i (release.version)}
					{@const meta = parts(release.version)}
					<section>
						<div class="flex items-baseline gap-3 border-b border-line/20 pb-2">
							<h2 class="font-serif text-xl text-heading">{meta.date}</h2>
							<span class="text-xs text-fg-muted">build {meta.build ?? "—"}</span>
							{#if i === 0}<span class="ml-auto text-xs text-primary-fg">latest</span>{/if}
						</div>

						<div class="mt-4 space-y-5">
							{#each release.groups as group (group.title)}
								<div>
									<h3 class="text-xs uppercase tracking-[0.16em] text-fg-muted">{group.title}</h3>
									<div class="mt-2 space-y-3">
										{#each group.components as component (component.name)}
											<div class="pl-4">
												{#if component.name !== "General"}
													<div class="mb-1 text-xs font-medium text-fg">{component.name}</div>
												{/if}
												<ul class="space-y-1.5">
													{#each component.items as item}
														<li class="flex gap-2 text-sm leading-relaxed text-fg-soft">
															<span class="mt-2 size-1 shrink-0 rounded-full bg-fg-faint"></span>
															<span>{item}</span>
														</li>
													{/each}
												</ul>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	</div>
</PageContainer>
