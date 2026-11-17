<script lang="ts">
	import { untrack } from "svelte";
	import { get } from "svelte/store";
	import type { Snippet, Component } from "svelte";
	import BackLink from "./ui/BackLink.svelte";
	import { viewTransitionActive } from "#lib/utils/motion.js";

	interface Props {
		title: string;
		subtitle?: string;
		icon?: Component;
		/** Renders a "← label" link above the title (e.g. back to the parent entity). */
		backHref?: string;
		backLabel?: string;
		actions?: Snippet;
		class?: string;
		/** Skip the entrance animations (already inside a view transition, or testing). */
		animate?: boolean;
	}

	let {
		title,
		subtitle,
		icon: Icon,
		backHref,
		backLabel = "Back",
		actions,
		class: className = "",
		animate = true
	}: Props = $props();

	// Read once at mount: entrance animations must not run inside a view
	// transition snapshot (see lib/utils/motion.ts).
	const entrance = untrack(() => animate) && !get(viewTransitionActive);
</script>

<div class="space-y-2 {className}">
	{#if backHref}
		<BackLink href={backHref} label={backLabel} class="-ml-3" />
	{/if}
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
		<div class="min-w-0">
			<h1 class="text-3xl font-bold text-[#fff4d6] flex items-center gap-3 flex-wrap">
				{#if Icon}
					<Icon class="size-7 shrink-0 text-[#f2b01e] {entrance ? 'animate-pop-in' : ''}" />
				{/if}
				<span class="break-words">{title}</span>
			</h1>
			{#if subtitle}
				<p class="text-[#a8a083] mt-1">{subtitle}</p>
			{/if}
		</div>
		{#if actions}
			<div class="flex flex-wrap gap-2 shrink-0">
				{@render actions()}
			</div>
		{/if}
	</div>
	<!-- Brass trim under the title bar; draws itself in on arrival. -->
	<div
		class="h-0.5 bg-gradient-to-r from-[#f2b01e]/80 via-[#c8b47a]/30 to-transparent {entrance
			? 'animate-trim-draw'
			: ''}"
	></div>
</div>
