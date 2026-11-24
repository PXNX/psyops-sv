<!-- A status-strip figure: small label, big mono number that counts up, tiny hint. -->
<script lang="ts">
	import type { Component } from "svelte";
	import { Tween, prefersReducedMotion } from "svelte/motion";
	import { cubicOut } from "svelte/easing";

	interface Props {
		label: string;
		value: number | null;
		suffix?: string;
		hint?: string;
		icon?: Component;
		/** Colour class for the number (e.g. text-warning when low). */
		tone?: string;
		title?: string;
	}
	let { label, value, suffix = "", hint, icon: Icon, tone = "text-fg", title }: Props = $props();

	const shown = new Tween(0, { duration: 700, easing: cubicOut });
	$effect(() => {
		shown.set(value ?? 0, { duration: prefersReducedMotion.current ? 0 : 700 });
	});
</script>

<div class="min-w-0 px-4 py-3" {title}>
	<p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
		{#if Icon}<Icon class="size-3.5 shrink-0" />{/if}
		<span class="truncate">{label}</span>
	</p>
	<p class="data mt-1 text-2xl font-semibold leading-none {value == null ? 'text-fg-faint' : tone}">
		{value == null ? "—" : Math.round(shown.current).toLocaleString()}{#if value != null && suffix}<span
				class="ml-0.5 text-sm text-fg-muted"
			>
				{suffix}
			</span>{/if}
	</p>
	{#if hint}<p class="mt-1 truncate text-[11px] text-fg-muted">{hint}</p>{/if}
</div>
