<!-- The dossier on a foreign state: documents the viewer's network copied
     there, each narrowing the figures of its own field. -->
<script lang="ts">
	import { slide } from "svelte/transition";
	import Badge from "#lib/component/ui/Badge.svelte";
	import { INTEL_GROUP_LABEL, fileGroups } from "#lib/utils/intel-estimate.js";
	import { dtg } from "#lib/utils/military.js";
	import IconLock from "~icons/fluent/document-lock-20-regular";

	interface DossierFile {
		id: number;
		siteId: string;
		title: string;
		classification: string;
		body: string;
		path: string | null;
		capturedAt: Date | string;
	}
	interface Props {
		files: DossierFile[];
		stateId: number;
	}
	let { files, stateId }: Props = $props();

	let openFileId = $state<number | null>(null);

	const CLASS_TONE: Record<string, string> = {
		"TOP SECRET": "border-l-hostile",
		SECRET: "border-l-orange-400",
		CONFIDENTIAL: "border-l-warning"
	};
</script>

<section aria-labelledby="dossier-title">
	<div class="mb-2 flex items-center gap-2">
		<h2 id="dossier-title" class="section-title">
			<IconLock class="size-4" /> Dossier
			{#if files.length}<span class="data tracking-normal">{files.length}</span>{/if}
		</h2>
		<a href="/ops/network?target={stateId}" class="ml-auto text-xs text-fg-muted hover:text-primary-hover">
			Network ops →
		</a>
	</div>
	{#if files.length}
		<ul class="grid grid-cols-1 gap-2">
			{#each files as file (file.id)}
				{@const open = openFileId === file.id}
				{@const groups = fileGroups(file.siteId)}
				<li
					class="min-w-0 rounded-sm border border-l-2 border-line/15 bg-surface-2 {CLASS_TONE[file.classification] ??
						'border-l-warning'}"
				>
					<button
						type="button"
						onclick={() => (openFileId = open ? null : file.id)}
						aria-expanded={open}
						class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-4"
					>
						<span class="min-w-0">
							<span class="block truncate text-sm font-medium text-fg">{file.title}</span>
							<span class="data block truncate text-[11px] text-fg-muted">
								{file.path ?? file.siteId} · {dtg(file.capturedAt)}
							</span>
							{#if groups.length}
								<span class="mt-0.5 block truncate text-[10px] text-fg-faint">
									Sharpens {groups.map((g) => INTEL_GROUP_LABEL[g].toLowerCase()).join(", ")} figures
								</span>
							{/if}
						</span>
						<Badge
							size="xs"
							tone={file.classification === "TOP SECRET"
								? "red"
								: file.classification === "SECRET"
									? "orange"
									: "amber"}
						>
							{file.classification}
						</Badge>
					</button>
					{#if open}
						<div class="border-t border-line/10 px-3 py-3" transition:slide={{ duration: 140 }}>
							<p class="mb-2 font-mono text-[10px] tracking-[0.18em] text-hostile-fg uppercase">
								{file.classification} // copied via network asset
							</p>
							<div class="text-sm leading-relaxed whitespace-pre-line text-fg-soft">{file.body}</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="panel flex items-center gap-2 p-4 text-sm text-fg-muted">
			<IconLock class="size-4 shrink-0" />
			Nothing copied yet. Plant an asset, open a site and pull its files.
		</div>
	{/if}
</section>
