<!-- Interactive walkthrough: each step spotlights a real control and advances
     when the player uses it (or via the manual fallback). Progress is stored
     per browser. The /docs pages remain the technical reference. -->
<script lang="ts">
	import { onMount } from "svelte";
	import IconInfo from "~icons/fluent/question-circle-24-regular";
	import IconClose from "~icons/fluent/dismiss-20-regular";
	import { Button, IconButton } from "#lib/component/ui/index.js";

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
	}

	interface Props {
		id: string;
		title?: string;
		steps: TutorialStep[];
	}
	let { id, title = "Interaktive Anleitung", steps }: Props = $props();

	let open = $state(false);
	let index = $state(0);
	let ready = $state(false);
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
		try {
			localStorage.setItem(key, JSON.stringify({ index: 0, done: true }));
		} catch {
			/* ignore */
		}
	}
	function restart() {
		index = 0;
		save();
		open = true;
	}

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { index?: number; done?: boolean } | null;
			if (saved?.done) ready = true;
			else {
				if (saved && typeof saved.index === "number") index = saved.index;
				open = true;
			}
		} catch {
			open = true;
		}
		ready = true;

		const onEvent = (e: Event) => {
			const detail = (e as CustomEvent<string>).detail;
			if (open && step?.done && detail === step.done) advance();
		};
		window.addEventListener("psyops:tutorial", onEvent);
		return () => window.removeEventListener("psyops:tutorial", onEvent);
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
				<IconButton icon={IconClose} label="Anleitung beenden" size="xs" shape="square" variant="ghost" onclick={finish} />
			</div>
			<p class="mt-2 text-xs leading-relaxed text-fg-soft">{step?.body}</p>
			<div class="mt-3 flex items-center justify-between gap-2">
				<button class="text-[11px] text-fg-muted hover:underline" onclick={finish}>Überspringen</button>
				<div class="flex items-center gap-1">
					{#if index > 0}<Button size="xs" variant="ghost" onclick={back}>Zurück</Button>{/if}
					<Button size="xs" onclick={advance}>{step?.manual ?? (index < steps.length - 1 ? "Weiter" : "Fertig")}</Button>
				</div>
			</div>
		</div>
	{:else}
		<button class="tour-help" onclick={restart} title="{title} erneut starten" aria-label={title}>
			<IconInfo class="size-5" />
		</button>
	{/if}
{/if}

<style>
	@reference "../../app.css";

	.tour-help {
		@apply fixed bottom-10 right-3 z-40 grid size-9 place-items-center rounded-full border border-line/30 bg-surface-2 text-fg-muted shadow-lg transition-colors hover:text-primary-fg md:bottom-12 md:right-4;
	}
	.tour-spotlight {
		@apply pointer-events-none fixed z-40 rounded-md border-2 border-primary;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
	}
	.tour-panel {
		@apply fixed z-50 w-[min(20rem,calc(100vw-1rem))] rounded-md border border-primary/30 bg-surface-1 p-3 shadow-2xl;
	}
</style>
