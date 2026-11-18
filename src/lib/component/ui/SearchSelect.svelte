<!-- src/lib/component/ui/SearchSelect.svelte -->
<!-- A dropdown with a search box, for picking one item out of a long list
     (states, regions, players). Keyboard: type to filter, ↑/↓ to move,
     Enter to pick, Esc to close. Submits `value` under `name` like a select. -->
<script
	lang="ts"
	generics="T extends { id: string | number; name: string; logo?: string | null; hint?: string | null }"
>
	import FluentChevronDown20Filled from "~icons/fluent/chevron-down-20-filled";
	import FluentSearch20Filled from "~icons/fluent/search-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import { fly } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { prefersReducedMotion } from "svelte/motion";
	import Logo from "../Logo.svelte";

	interface Props {
		items: T[];
		/** The chosen item's id as a string (empty/undefined when nothing is chosen). */
		value?: string;
		name?: string;
		id?: string;
		placeholder?: string;
		searchPlaceholder?: string;
		empty?: string;
		disabled?: boolean;
	}

	let {
		items,
		value = $bindable(),
		name,
		id,
		placeholder = "Choose…",
		searchPlaceholder = "Search…",
		empty = "Nothing matches.",
		disabled = false
	}: Props = $props();

	let open = $state(false);
	let query = $state("");
	let active = $state(0);
	let root: HTMLDivElement | undefined = $state();
	let search: HTMLInputElement | undefined = $state();
	let list: HTMLUListElement | undefined = $state();

	const listId = `${id ?? "search-select"}-list`;
	const selected = $derived(items.find((i) => String(i.id) === value) ?? null);
	const filtered = $derived.by(() => {
		const q = query.trim().toLocaleLowerCase();
		if (!q) return items;
		// Names that start with the query first, then ones that contain it.
		const starts: T[] = [];
		const contains: T[] = [];
		for (const item of items) {
			const n = item.name.toLocaleLowerCase();
			if (n.startsWith(q)) starts.push(item);
			else if (n.includes(q)) contains.push(item);
		}
		return [...starts, ...contains];
	});

	function show() {
		if (disabled) return;
		open = true;
		query = "";
		const i = items.findIndex((it) => String(it.id) === value);
		active = Math.max(0, i);
		queueMicrotask(() => {
			search?.focus();
			scrollActive();
		});
	}

	function close(refocus = true) {
		open = false;
		if (refocus) root?.querySelector<HTMLButtonElement>("[data-trigger]")?.focus();
	}

	function pick(item: T) {
		value = String(item.id);
		close();
	}

	function scrollActive() {
		list?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			active = Math.min(filtered.length - 1, active + 1);
			scrollActive();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			active = Math.max(0, active - 1);
			scrollActive();
		} else if (e.key === "Enter") {
			e.preventDefault();
			const item = filtered[active];
			if (item) pick(item);
		} else if (e.key === "Escape") {
			e.preventDefault();
			close();
		} else if (e.key === "Tab") {
			close(false);
		}
	}

	function onTriggerKey(e: KeyboardEvent) {
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			show();
		}
	}

	$effect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) close(false);
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	});
</script>

<div class="relative" bind:this={root}>
	{#if name}<input type="hidden" {name} value={value ?? ""} />{/if}

	<button
		type="button"
		{id}
		data-trigger
		class="field-control rounded-sm px-3 py-2.5 w-full flex items-center gap-3 text-left disabled:opacity-50"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={listId}
		{disabled}
		onclick={() => (open ? close() : show())}
		onkeydown={onTriggerKey}
	>
		{#if selected}
			{#if selected.logo !== undefined}
				<Logo src={selected.logo} alt="" class="size-7 shrink-0 rounded-sm" />
			{/if}
			<span class="flex-1 min-w-0 truncate text-[#f5efd8] font-medium">{selected.name}</span>
		{:else}
			<span class="flex-1 text-[#ab9f7c]/75">{placeholder}</span>
		{/if}
		<FluentChevronDown20Filled
			class="size-4 shrink-0 text-[#a8a083] transition-transform duration-200 {open ? 'rotate-180' : ''}"
		/>
	</button>

	{#if open}
		<div
			class="absolute z-30 left-0 right-0 mt-1 rounded-sm border border-[#c8b47a]/30 bg-[#141810] shadow-[0_12px_32px_rgba(0,0,0,0.55)] overflow-hidden"
			transition:fly={{ y: -6, duration: prefersReducedMotion.current ? 0 : 140, easing: cubicOut }}
		>
			<div class="flex items-center gap-2 px-3 border-b border-[#c8b47a]/15">
				<FluentSearch20Filled class="size-4 shrink-0 text-[#a8a083]" />
				<input
					bind:this={search}
					bind:value={query}
					type="text"
					role="combobox"
					aria-controls={listId}
					aria-expanded="true"
					aria-autocomplete="list"
					aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].id}` : undefined}
					autocomplete="off"
					spellcheck="false"
					placeholder={searchPlaceholder}
					class="flex-1 bg-transparent py-2.5 text-sm text-[#f5efd8] placeholder:text-[#ab9f7c]/55 outline-none"
					oninput={() => (active = 0)}
					onkeydown={onKey}
				/>
			</div>
			<ul bind:this={list} id={listId} role="listbox" class="max-h-72 overflow-y-auto py-1">
				{#each filtered as item, i (item.id)}
					{@const isSelected = String(item.id) === value}
					<li
						id="{listId}-{item.id}"
						role="option"
						aria-selected={isSelected}
						data-index={i}
						class="flex items-center gap-3 px-3 py-2 cursor-pointer {i === active ? 'bg-[#f2b01e]/12' : ''} {isSelected
							? 'text-[#ffd35c]'
							: 'text-[#f5efd8]'}"
						onpointermove={() => (active = i)}
						onclick={() => pick(item)}
					>
						{#if item.logo !== undefined}
							<Logo src={item.logo} alt="" class="size-7 shrink-0 rounded-sm" />
						{/if}
						<span class="flex-1 min-w-0">
							<span class="block truncate text-sm font-medium">{item.name}</span>
							{#if item.hint}<span class="block truncate text-xs text-[#a8a083]">{item.hint}</span>{/if}
						</span>
						{#if isSelected}<FluentCheckmark20Filled class="size-4 shrink-0" />{/if}
					</li>
				{:else}
					<li class="px-3 py-3 text-sm text-[#a8a083]">{empty}</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
