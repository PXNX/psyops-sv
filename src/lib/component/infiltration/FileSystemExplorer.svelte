<!-- src/lib/component/infiltration/FileSystemExplorer.svelte -->
<!-- Life inside a compromised host: walk the directories, open the mail,
     logs, ledgers, rosters and partially redacted records, search them, and
     copy the useful ones into the dossier. The catalogue is deterministic; the
     server logs every command and charges heat when a record leaves the host. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import {
		CONTENT_KIND_LABEL,
		CLASSIFICATION_TONE,
		siteRecords,
		listDirectory,
		type SystemRecord
	} from "#lib/config/index.js";
	import { toastResult } from "#lib/ui/toast.svelte.js";
	import { Badge } from "#lib/component/ui/index.js";
	import type { BadgeTone } from "#lib/component/ui/styles.js";
	import IconFolder from "~icons/mdi/folder-outline";
	import IconFile from "~icons/mdi/file-document-outline";
	import IconSearch from "~icons/mdi/magnify";
	import IconCopy from "~icons/mdi/content-copy";
	import IconCheck from "~icons/mdi/check";

	interface Props {
		site: any;
		assetId: number;
		targetName: string;
		copiedIds: string[];
		onResult?: (data: any) => void;
	}
	let { site, assetId, targetName, copiedIds, onResult }: Props = $props();

	const fs = $derived(siteRecords(site, targetName));
	let path = $state("/");
	let record = $state<SystemRecord | null>(null);
	let query = $state("");
	let matches = $state<{ record: SystemRecord; match: string }[] | null>(null);
	let command = $state("$ shell --session pivot");
	let busy = $state<string | null>(null);

	const listing = $derived(listDirectory(fs, path));
	const copied = $derived(new Set(copiedIds));

	// `enhance` invokes the outer function on submit; doing this work in the
	// factory would set `busy` (and disable the buttons) during render.
	const submit = (key: string, cmd: string) => () => {
		command = cmd;
		busy = key;
		return async ({ result, update }: any) => {
			busy = null;
			await update({ reset: false });
			toastResult(result);
			if (result.type !== "success") return;
			const d = result.data ?? {};
			if (d.browse) path = d.browse.path;
			if (d.read) record = d.read.record;
			if (d.grep) matches = d.grep.matches;
			if (d.exfil) onResult?.(d);
		};
	};

	function parts(p: string) {
		return p === "/" ? [""] : p.split("/").filter(Boolean);
	}
	function crumb(i: number) {
		const ps = parts(path);
		return "/" + ps.slice(0, i + 1).join("/");
	}
	const tone = (c: string): BadgeTone => CLASSIFICATION_TONE[c as keyof typeof CLASSIFICATION_TONE] ?? "neutral";
	const fragments = (line: string) => line.split(/(\[REDACTED\]|▓+)/g);
</script>

<div class="panel overflow-hidden rounded-sm border border-line/25">
	<div
		class="flex flex-wrap items-center justify-between gap-2 border-b border-line/15 bg-surface-1 px-3 py-2 font-mono text-xs"
	>
		<span class="text-fg-muted">{command}</span>
		<span class="data text-[10px] text-fg-faint">{fs.files.length} files · {fs.dirs.length} dirs</span>
	</div>

	<div class="grid min-h-80 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
		<!-- Directory pane -->
		<div class="border-b border-line/15 p-3 lg:border-b-0 lg:border-r">
			<nav class="mb-2 flex flex-wrap items-center gap-1 font-mono text-[11px] text-fg-muted" aria-label="Path">
				{#each parts(path) as part, i (crumb(i))}
					<form
						method="POST"
						action="?/browse"
						class="inline"
						use:enhance={submit(`dir-${crumb(i)}`, `$ cd ${crumb(i)}`)}
					>
						<input type="hidden" name="assetId" value={assetId} />
						<input type="hidden" name="siteId" value={site.id} />
						<input type="hidden" name="path" value={crumb(i)} />
						<button type="submit" class="hover:text-primary">{part || "/"}</button>
					</form>
					{#if i < parts(path).length - 1}<span>/</span>{/if}
				{/each}
			</nav>

			<form
				method="POST"
				action="?/grep"
				class="mb-3 flex gap-1"
				use:enhance={submit("grep", `$ grep -ri "${query}" .`)}
			>
				<input type="hidden" name="assetId" value={assetId} />
				<input type="hidden" name="siteId" value={site.id} />
				<input
					type="search"
					name="query"
					bind:value={query}
					placeholder="grep files…"
					class="field-control min-w-0 flex-1 rounded-sm px-2 py-1 font-mono text-xs"
				/>
				<button type="submit" disabled={!query.trim() || !!busy} class="btn btn-ghost btn-sm" aria-label="Search files">
					<IconSearch class="size-3.5" />
				</button>
			</form>

			{#if matches !== null}
				<div class="mb-3">
					<div class="mb-1 flex items-center justify-between text-[10px] text-fg-muted">
						<span>grep results ({matches.length})</span>
						<button type="button" class="hover:text-primary" onclick={() => (matches = null)}>clear</button>
					</div>
					<ul class="space-y-1">
						{#each matches as m (m.record.id)}
							<li>
								<button
									type="button"
									class="w-full truncate rounded-sm px-2 py-1 text-left font-mono text-[11px] text-fg-soft hover:bg-surface-4"
									onclick={() => (record = m.record)}
								>
									<span class="text-primary">{m.record.name}</span> <span class="text-fg-faint">— {m.match}</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<ul class="max-h-72 space-y-0.5 overflow-y-auto font-mono text-xs">
					{#each listing.dirs as dir (dir)}
						<li>
							<form method="POST" action="?/browse" use:enhance={submit(`dir-${dir}`, `$ cd ${dir}`)}>
								<input type="hidden" name="assetId" value={assetId} />
								<input type="hidden" name="siteId" value={site.id} />
								<input type="hidden" name="path" value={dir} />
								<button
									type="submit"
									class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-fg hover:bg-surface-4"
								>
									<IconFolder class="size-3.5 shrink-0 text-warning" />
									<span class="truncate">{dir.split("/").pop()}/</span>
								</button>
							</form>
						</li>
					{/each}
					{#each listing.files as file (file.id)}
						<li>
							<form method="POST" action="?/read" use:enhance={submit(`read-${file.id}`, `$ cat ${file.path}`)}>
								<input type="hidden" name="assetId" value={assetId} />
								<input type="hidden" name="siteId" value={site.id} />
								<input type="hidden" name="recordId" value={file.id} />
								<button
									type="submit"
									class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-surface-4 {record?.id ===
									file.id
										? 'bg-surface-4'
										: ''}"
								>
									<IconFile class="size-3.5 shrink-0 text-fg-muted" />
									<span class="min-w-0 flex-1 truncate text-fg-soft">{file.name}</span>
									{#if copied.has(file.id)}<IconCheck class="size-3 shrink-0 text-positive-fg" />{/if}
									<Badge size="xs" tone={tone(file.classification)}>{file.classification}</Badge>
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Record pane -->
		<div class="p-3">
			{#if record}
				<div class="mb-2 flex flex-wrap items-start justify-between gap-2">
					<div class="min-w-0">
						<h4 class="truncate font-mono text-sm text-fg">{record.name}</h4>
						<p class="data truncate text-[10px] text-fg-muted">
							{record.path} · {record.author} · {record.date} · {record.size.toLocaleString()} B
						</p>
					</div>
					<Badge size="xs" tone={tone(record.classification)}>{record.classification}</Badge>
				</div>
				<p class="mb-2 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
					{CONTENT_KIND_LABEL[record.kind] ?? record.kind} · partially recovered
				</p>
				<pre
					class="max-h-80 overflow-auto whitespace-pre-wrap rounded-sm bg-surface-0 p-3 font-mono text-[11px] leading-relaxed text-fg-soft">{#each record.body.split("\n") as line, i (i)}
						{#each fragments(line) as frag, j (j)}{#if frag.startsWith("[REDACTED]") || frag.startsWith("▓")}<span
									class="text-warning">{frag}</span
								>{:else}{frag}{/if}{/each}
					{/each}</pre>
				<form
					method="POST"
					action="?/exfil"
					class="mt-3"
					use:enhance={submit("exfil", `$ scp ${record.path} ./dossier/`)}
				>
					<input type="hidden" name="assetId" value={assetId} />
					<input type="hidden" name="siteId" value={site.id} />
					<input type="hidden" name="recordId" value={record.id} />
					<button
						type="submit"
						disabled={!!busy || copied.has(record.id)}
						class="btn btn-secondary btn-sm w-full disabled:opacity-50"
					>
						{#if copied.has(record.id)}
							<IconCheck class="size-3.5" /> In dossier
						{:else}
							<IconCopy class="size-3.5" /> Copy to dossier · +{record.heat} heat
						{/if}
					</button>
				</form>
			{:else}
				<div class="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center text-fg-muted">
					<IconFile class="size-8 opacity-50" />
					<p class="text-sm">Open a file to read it.</p>
					<p class="max-w-xs text-xs">Mail, logs, ledgers, rosters, contracts and notes — most only partly readable.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
