<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { findParentNodeClosestToPos, posToDOMRect } from "@tiptap/core";
	import type { Editor } from "@tiptap/core";
	// import TableMenuControls from './TableMenuControls.svelte';
	// import BubbleMenu from './BubbleMenu.svelte';

	// Props
	export let editor: Editor;
	export let disableDebounce = false;
	export let debounceProps = {};
	export let labels = {};
	export let placement = "top-start";
	export let fallbackPlacements = ["bottom-start", "top", "bottom", "top-end", "bottom-end"];
	export let flipPadding = {
		top: 35,
		left: 8,
		right: 8,
		bottom: -Infinity
	};

	// State
	let isEditorFocused = false;
	let debouncedFocusTimeout: NodeJS.Timeout;
	let bubbleMenuAnchorEl: { getBoundingClientRect: () => DOMRect } | null = null;

	// Debounced focus handler
	function handleEditorFocus() {
		clearTimeout(debouncedFocusTimeout);
		debouncedFocusTimeout = setTimeout(() => {
			isEditorFocused = editor?.isFocused || false;
		}, 100); // Adjust debounce delay as needed
	}

	// Update anchor element for bubble menu positioning
	function updateBubbleMenuAnchor() {
		if (!editor) {
			bubbleMenuAnchorEl = null;
			return;
		}

		bubbleMenuAnchorEl = {
			getBoundingClientRect: () => {
				const nearestTableParent = editor.isActive("table")
					? findParentNodeClosestToPos(editor.state.selection.$anchor, (node) => node.type.name === "table")
					: null;

				if (nearestTableParent) {
					const wrapperDomNode = editor.view.nodeDOM(nearestTableParent.pos) as HTMLElement | null | undefined;

					const tableDomNode = wrapperDomNode?.querySelector("table");
					if (tableDomNode) {
						return tableDomNode.getBoundingClientRect();
					}
				}

				const { ranges } = editor.state.selection;
				const from = Math.min(...ranges.map((range) => range.$from.pos));
				const to = Math.max(...ranges.map((range) => range.$to.pos));
				return posToDOMRect(editor.view, from, to);
			}
		};
	}

	// Lifecycle
	onMount(() => {
		if (editor) {
			editor.on("focus", handleEditorFocus);
			editor.on("blur", handleEditorFocus);
			editor.on("transaction", updateBubbleMenuAnchor);
		}
	});

	onDestroy(() => {
		if (editor) {
			editor.off("focus", handleEditorFocus);
			editor.off("blur", handleEditorFocus);
			editor.off("transaction", updateBubbleMenuAnchor);
		}
		clearTimeout(debouncedFocusTimeout);
	});

	// Computed
	$: isOpen = isEditorFocused && editor?.isActive("table");
	$: shouldRender = editor?.isEditable;
</script>

{#if shouldRender}
	<div class="z-10 bg-purple-400">CONTROLS</div>

	<!--      <BubbleMenu
      {editor}
      open={isOpen}
      anchorEl={bubbleMenuAnchorEl}
      {placement}
      {fallbackPlacements}
      {flipPadding}
    >
      {#if disableDebounce}
        <div class="controls">
          <TableMenuControls {labels} />
        </div>
      {:else}
       
          <div class="controls">
            <TableMenuControls {labels} />
          </div>
       
      {/if}
    </BubbleMenu> -->
{/if}

<style>
	.controls {
		max-width: 90vw;
		padding: 0.5rem 1rem;
	}
</style>
