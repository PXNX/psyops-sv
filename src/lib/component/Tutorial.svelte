<!-- Interactive walkthrough: each step spotlights a real control and advances
     when the player uses it (or via the manual fallback). Progress is stored
     per browser. The /docs pages remain the technical reference. -->
<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { browser } from "$app/env";
	import IconClose from "~icons/fluent/dismiss-20-regular";
	import IconLink from "~icons/fluent/link-20-regular";
	import { Button, IconButton } from "#lib/component/ui/index.js";
	import TutorialArt from "#lib/component/docs/TutorialArt.svelte";
	import type { TutorialArtKind } from "#lib/component/docs/art.js";

	/** Only one tour runs at a time; the docs links can launch a specific one. */
	let activeTour: string | null = null;

	export interface TutorialStep {
		id: string;
		title: string;
		body: string;
		/** CSS selector of the control to spotlight. */
		target?: string;
		/** Custom-event id that completes this step. */
		done?: string;
		/** Label of the fallback button when the step has no detectable action. */
		manual?: string;
		/** Small illustration shown above the step text. */
		art?: TutorialArtKind;
	}

	interface Props {
		id: string;
		title?: string;
		steps: TutorialStep[];
	}
	let { id, title = "Interactive guide", steps }: Props = $props();

	let open = $state(false);
	let index = $state(0);
	let ready = $state(false);
	let copied = $state(false);
	let spotlight = $state<{ x: number; y: number; w: number; h: number } | null>(null);
	let key = $derived(`psyops-tutorial-${id}`);

	const step = $derived(steps[index]);

	function save() {
		try {
			localStorage.setItem(key, JSON.stringify({ index, done: index >= steps.length }));
		} catch {
			/* private browsing — the tour still works for this session */
		}
	}

	function takeOver() {
		if (activeTour && activeTour !== id)
			window.dispatchEvent(new CustomEvent("psyops:tutorial-takeover", { detail: id }));
		activeTour = id;
	}

	function advance() {
		if (index < steps.length - 1) index++;
		else finish();
		save();
	}
	function back() {
		if (index > 0) index--;
		save();
	}
	function finish() {
		open = false;
		index = 0;
		if (activeTour === id) activeTour = null;
		try {
			localStorage.setItem(key, JSON.stringify({ index: 0, done: true }));
		} catch {
			/* ignore */
		}
	}
	function restart() {
		index = 0;
		save();
		takeOver();
		open = true;
	}

	/** Copy a link that reopens this exact tutorial step. */
	async function copyStepLink() {
		if (!browser) return;
		const url = new URL(page.url.href);
		url.searchParams.set("tutorial", id);
		url.searchParams.set("step", String(index + 1));
		try {
			await navigator.clipboard.writeText(url.toString());
			copied = true;
			window.setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}

	function jumpToLinkedStep() {
		const raw = page.url.searchParams.get("step");
		const stepNumber = Number(raw);
		if (!raw || !Number.isInteger(stepNumber)) return;
		index = Math.max(0, Math.min(steps.length - 1, stepNumber - 1));
	}

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { index?: number; done?: boolean } | null;
			if (saved?.done) ready = true;
			else {
				if (saved && typeof saved.index === "number") index = saved.index;
				takeOver();
				open = true;
			}
		} catch {
			takeOver();
			open = true;
		}
		if (page.url.searchParams.get("tutorial") === id) jumpToLinkedStep();
		ready = true;

		const onEvent = (e: Event) => {
			const detail = (e as CustomEvent<string>).detail;
			if (open && step?.done && detail === step.done) advance();
		};
		const onTakeover = (e: Event) => {
			if ((e as CustomEvent<string>).detail !== id) open = false;
		};
		window.addEventListener("psyops:tutorial", onEvent);
		window.addEventListener("psyops:tutorial-takeover", onTakeover);
		return () => {
			window.removeEventListener("psyops:tutorial", onEvent);
			window.removeEventListener("psyops:tutorial-takeover", onTakeover);
		};
	});

	// Links from /docs use ?tutorial=<id> (or "restart") to relaunch a tour.
	$effect(() => {
		const request = page.url.searchParams.get("tutorial");
		if (!ready || !request || (request !== id && request !== "restart" && request !== "start")) return;
		restart();
		if (request === id) jumpToLinkedStep();
	});

	$effect(() => {
		if (!open || !step?.target || typeof window === "undefined") {
			spotlight = null;
			return;
		}
		let cancelled = false;
		const find = () => {
			if (cancelled) return;
			const el = document.querySelector(step.target!);
			if (!el) {
				spotlight = null;
				return;
			}
			const r = el.getBoundingClientRect();
			spotlight = { x: r.left, y: r.top, w: r.width, h: r.height };
		};
		find();
		const timer = window.setInterval(find, 350);
		window.addEventListener("scroll", find, true);
		window.addEventListener("resize", find);
		return () => {
			cancelled = true;
			window.clearInterval(timer);
			window.removeEventListener("scroll", find, true);
			window.removeEventListener("resize", find);
		};
	});

	const panelStyle = $derived.by(() => {
		if (typeof window === "undefined" || !spotlight) return "right: 1rem; bottom: 3.5rem;";
		const width = 320;
		const left = Math.min(Math.max(8, spotlight.x), Math.max(8, window.innerWidth - width - 8));
		const below = spotlight.y + spotlight.h + 12 + 190 < window.innerHeight;
		return `left: ${left}px; ${below ? `top: ${spotlight.y + spotlight.h + 12}px` : `top: ${Math.max(8, spotlight.y - 200)}px`};`;
	});
</script>

{#if ready}
	{#if open}
		{#if spotlight}
			<div
				class="tour-spotlight"
				style="left:{spotlight.x - 6}px; top:{spotlight.y - 6}px; width:{spotlight.w + 12}px; height:{spotlight.h + 12}px;"
				aria-hidden="true"
			></div>
		{/if}
		<div class="tour-panel animate-pop-in" style={panelStyle} role="dialog" aria-label={title}>
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<div class="text-[10px] uppercase tracking-[0.18em] text-fg-muted">{title} · {index + 1}/{steps.length}</div>
					<h3 class="truncate text-sm font-semibold text-heading">{step?.title}</h3>
				</div>
				<div class="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						class="rounded-sm p-1 text-fg-muted transition-colors hover:bg-surface-5 hover:text-primary-fg"
						title="Copy a link to this tutorial step"
						aria-label="Copy link to this tutorial step"
						onclick={copyStepLink}
					>
						{#if copied}<span class="text-[10px] text-positive-fg">Copied</span>{:else}<IconLink class="size-4" />{/if}
					</button>
					<IconButton icon={IconClose} label="End guide" size="xs" shape="square" variant="ghost" onclick={finish} />
				</div>
			</div>
			{#if step?.art}
				<TutorialArt kind={step.art} />
			{/if}
			<div class="mt-2 flex items-center gap-1" aria-label="Guide progress">
				{#each steps as s, i (s.id)}
					<button
						type="button"
						class="tour-dot rounded-full transition-all {i === index ? 'w-4 bg-primary' : i < index ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-line'}"
						class:active={i === index}
						aria-label="Go to step {i + 1}: {s.title}"
						aria-current={i === index ? "step" : undefined}
						onclick={() => {
							index = i;
							save();
						}}
					></button>
				{/each}
			</div>
			<p class="mt-2 text-xs leading-relaxed text-fg-soft">{step?.body}</p>
			<div class="mt-3 flex items-center justify-between gap-2">
				<button class="text-[11px] text-fg-muted hover:underline" onclick={finish}>Skip</button>
				<div class="flex items-center gap-1">
					{#if index > 0}<Button size="xs" variant="ghost" onclick={back}>Back</Button>{/if}
					<Button size="xs" onclick={advance}>{step?.manual ?? (index < steps.length - 1 ? "Next" : "Finish")}</Button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	@reference "../../app.css";

	.tour-spotlight {
		@apply pointer-events-none fixed z-40 rounded-md border-2 border-primary;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
	}
	.tour-panel {
		@apply fixed z-50 w-[min(20rem,calc(100vw-1rem))] rounded-md border border-primary/30 bg-surface-1 p-3 shadow-2xl;
	}
	.tour-dot {
		@apply h-1.5 shrink-0;
	}
	.tour-dot:hover {
		@apply bg-primary-fg;
	}
</style>
