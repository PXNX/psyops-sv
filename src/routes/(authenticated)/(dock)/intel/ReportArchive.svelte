<!-- src/routes/(authenticated)/(dock)/intel/ReportArchive.svelte -->
<!-- The report archive as a compact, sortable list. A click on a row opens
     that single report as a printed INTREP underneath it. -->
<script lang="ts">
	import { slide } from "svelte/transition";
	import { prefersReducedMotion } from "svelte/motion";
	import { UnitBadge } from "#lib/component/tactical/index.js";
	import { SENSORS, type SensorId } from "#lib/config/index.js";
	import { ageLabel } from "#lib/utils/military.js";
	import IconChevron from "~icons/fluent/chevron-down-20-regular";
	import IconArrowSort from "~icons/fluent/arrow-sort-20-regular";
	import type { PageData } from "./$types";
	import IntelReport from "./IntelReport.svelte";
	import { reportNo } from "./labels";

	type Report = PageData["reports"][number];
	interface Props {
		reports: Report[];
		now: Date;
		onImagery: (reportId: number) => void;
	}
	let { reports, now, onImagery }: Props = $props();

	type SortKey = "time" | "region" | "sensor" | "contacts";
	const SORTS: { key: SortKey; label: string }[] = [
		{ key: "time", label: "Newest" },
		{ key: "region", label: "Region" },
		{ key: "sensor", label: "Sensor" },
		{ key: "contacts", label: "Contacts" }
	];
	let sort = $state<SortKey>("time");
	let openId = $state<number | null>(null);

	const contacts = (r: Report) => r.findings.categories.reduce((s, c) => s + (c.count ?? 0), 0);
	const sorted = $derived.by(() => {
		const xs = [...reports];
		const byTime = (a: Report, b: Report) => +new Date(b.observedAt) - +new Date(a.observedAt);
		if (sort === "region") xs.sort((a, b) => a.region.name.localeCompare(b.region.name) || byTime(a, b));
		else if (sort === "sensor") xs.sort((a, b) => a.sensor.localeCompare(b.sensor) || byTime(a, b));
		else if (sort === "contacts") xs.sort((a, b) => contacts(b) - contacts(a) || byTime(a, b));
		else xs.sort(byTime);
		return xs;
	});
	const sensorShort = (s: string) => SENSORS[s as SensorId]?.short ?? s;
	const ago = (d: string) => {
		const a = ageLabel(d, now);
		return a === "now" ? "just now" : `${a} ago`;
	};
	const toggle = (id: number) => (openId = openId === id ? null : id);
</script>

<div class="mb-2 flex flex-wrap items-center gap-1 text-xs" role="group" aria-label="Sort reports">
	<IconArrowSort class="size-4 text-fg-faint" aria-hidden="true" />
	{#each SORTS as s (s.key)}
		<button
			type="button"
			class="rounded-sm px-2 py-1 transition-colors {sort === s.key
				? 'bg-primary/15 text-primary-fg'
				: 'text-fg-muted hover:bg-surface-7 hover:text-fg'}"
			aria-pressed={sort === s.key}
			onclick={() => (sort = s.key)}
		>
			{s.label}
		</button>
	{/each}
</div>

<ul class="divide-y divide-line/15">
	{#each sorted as r (r.id)}
		{@const n = contacts(r)}
		{@const open = openId === r.id}
		<li id="report-{r.id}">
			<button
				type="button"
				class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-1 py-2.5 text-left transition-colors hover:bg-surface-5 sm:grid-cols-[4.5rem_minmax(0,1fr)_5rem_7rem_3.5rem_1rem] {open
					? 'bg-surface-5'
					: ''} {r.fresh ? '' : 'text-fg-muted'}"
				aria-expanded={open}
				aria-controls="intrep-{r.id}"
				onclick={() => toggle(r.id)}
			>
				<span class="data text-[11px] {r.fresh ? 'text-primary-fg' : 'text-fg-faint'}">{sensorShort(r.sensor)}</span>
				<span class="min-w-0">
					<span class="block truncate text-sm font-medium {r.fresh ? 'text-fg' : 'text-fg-soft'}">{r.region.name}</span>
					<span class="block truncate text-[11px] text-fg-faint sm:hidden">{reportNo(r.id)} · {ago(r.observedAt)}</span>
				</span>
				<span class="data hidden text-[11px] text-fg-faint sm:block">{reportNo(r.id).replace("INTREP ", "#")}</span>
				<span class="flex items-center justify-end gap-1.5 text-xs">
					{#if r.findings.outcome === "intercepted"}
						<span class="text-hostile-fg">Platform lost</span>
					{:else if r.findings.outcome === "obscured"}
						<span class="text-warning">No observation</span>
					{:else if n}
						<UnitBadge affiliation="hostile" size={14} />
						<span class="data {r.fresh ? 'text-hostile-fg' : ''}">{n}</span>
						<span class="hidden text-fg-faint sm:inline">seen</span>
					{:else}
						<span class="text-fg-faint">Nothing seen</span>
					{/if}
				</span>
				<span class="data hidden text-right text-xs sm:block">{ageLabel(r.observedAt, now)}</span>
				<IconChevron
					class="hidden size-4 text-fg-faint transition-transform sm:block {open ? 'rotate-180' : ''}"
					aria-hidden="true"
				/>
			</button>
			{#if open}
				<div
					id="intrep-{r.id}"
					class="pt-1 pb-4"
					transition:slide={{ duration: prefersReducedMotion.current ? 0 : 220 }}
				>
					<IntelReport report={r} {onImagery} />
				</div>
			{/if}
		</li>
	{/each}
</ul>
