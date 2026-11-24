<!-- src/routes/(authenticated)/(dock)/domains/DomainTile.svelte -->
<!-- One tile of the status strip: a domain, its key figure and its state. -->
<script lang="ts">
	import type { Component } from "svelte";
	import type { DomainStatus } from "./shared";

	interface Props {
		icon: Component;
		label: string;
		value: string;
		hint: string;
		status: DomainStatus;
		href: string;
		title?: string;
	}

	let { icon: Icon, label, value, hint, status, href, title }: Props = $props();

	const STATUS: Record<DomainStatus, { text: string; dot: string; ring: string }> = {
		ok: { text: "OK", dot: "bg-positive", ring: "border-line/15" },
		degraded: { text: "Degraded", dot: "bg-warning", ring: "border-warning/40" },
		idle: { text: "Inactive", dot: "bg-fg-faint", ring: "border-line/15" }
	};
	const s = $derived(STATUS[status]);
</script>

<a
	{href}
	{title}
	class="panel-interactive block min-w-0 p-3 {s.ring}"
	aria-label="{label}: {value}, {s.text.toLowerCase()}"
>
	<div class="flex items-center justify-between gap-2">
		<span class="section-title"><Icon class="size-4" />{label}</span>
		<span class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
			<span
				class="size-1.5 rounded-full {s.dot} {status === 'degraded' ? 'animate-pulse motion-reduce:animate-none' : ''}"
			></span>
			{s.text}
		</span>
	</div>
	<p class="data mt-2 text-2xl leading-none font-semibold text-fg">{value}</p>
	<p class="mt-1 truncate text-xs text-fg-muted">{hint}</p>
</a>
