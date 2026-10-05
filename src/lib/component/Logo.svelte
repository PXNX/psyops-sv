<!-- src/lib/component/Logo.svelte -->
<script lang="ts">
	import type { Component } from "svelte";
	import FluentImage24Regular from "~icons/fluent/image-24-regular";
	import { settings } from "#lib/settings.svelte.js";

	interface Props {
		src: string | null | undefined;
		alt: string;
		class?: string;
		placeholderIcon?: Component;
		placeholderGradient?: string;
	}

	let {
		src,
		alt,
		class: className = "",
		placeholderIcon = FluentImage24Regular,
		placeholderGradient = "from-[#315d8d] to-[#1e3a5f]"
	}: Props = $props();

	let loaded = $state(false);
	let error = $state(false);
	let img: HTMLImageElement | undefined = $state();

	// Single effect for cache check - runs once when img is bound
	$effect(() => {
		if (img?.complete && img.naturalHeight > 0) {
			loaded = true;
		}
	});

	// Reset on src change
	$effect(() => {
		void src;
		loaded = false;
		error = false;
	});

	const shouldShow = $derived(!!src && !error && settings.loadImages);
</script>

<div class="relative overflow-hidden {className} rounded-sm size-10">
	{#if shouldShow}
		<img
			bind:this={img}
			{src}
			{alt}
			loading="lazy"
			decoding="async"
			class="size-full object-cover transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
			onload={() => (loaded = true)}
			onerror={() => (error = true)}
		/>
		{#if !loaded}
			<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br {placeholderGradient}">
				<svelte:component this={placeholderIcon} class="size-12 animate-pulse text-[#fff7e8]/70" />
			</div>
		{/if}
	{:else}
		<div class="flex size-full items-center justify-center bg-gradient-to-br {placeholderGradient}">
			<svelte:component this={placeholderIcon} class="size-10 text-[#fff7e8]/90" />
		</div>
	{/if}
</div>
