<script lang="ts">
	import { createEditor, Editor, EditorContent, BubbleMenu, FloatingMenu } from "svelte-tiptap";
	import Document from "@tiptap/extension-document";
	import Paragraph from "@tiptap/extension-paragraph";
	import Text from "@tiptap/extension-text";
	import TextStyle from "@tiptap/extension-text-style";
	import ListItem from "@tiptap/extension-list-item";
	import Heading from "@tiptap/extension-heading";
	import type { NodeType } from "@tiptap/pm/model";
	import { Node as ProseMirrorNode } from "prosemirror-model";
	import Table from "@tiptap/extension-table";
	import TableCell from "@tiptap/extension-table-cell";
	import TableHeader from "@tiptap/extension-table-header";
	import TableRow from "@tiptap/extension-table-row";
	import Bold from "@tiptap/extension-bold";
	import Italic from "@tiptap/extension-italic";
	import Strike from "@tiptap/extension-strike";
	import TextAlign from "@tiptap/extension-text-align";
	import Link from "@tiptap/extension-link";
	import Image from "@tiptap/extension-image";
	import { onMount } from "svelte";
	import type { Readable } from "svelte/store";

	import MdiClose from "~icons/mdi/close";

	import MdiLink from "~icons/mdi/link";
	import MdiImagePlus from "~icons/mdi/image-plus";
	import MdiTablePlus from "~icons/mdi/table-plus";
	import MdiFormatClear from "~icons/mdi/format-clear";
	import AlignmentOptions from "./AlignmentOptions.svelte";
	import ListOptions from "./ListOptions.svelte";
	import FormattingOptions from "./FormattingOptions.svelte";
	import Placeholder from "@tiptap/extension-placeholder";
	import StarterKit from "@tiptap/starter-kit";
	import Typography from "@tiptap/extension-typography";
	import { fade } from "svelte/transition";
	import {
		type NodeViewRenderer,
		type NodeViewRendererProps,
		type ChainedCommands,
		type SingleCommands,
		findParentNode
	} from "@tiptap/core";

	let editor = $state() as Readable<Editor>;
	let linkUrl = $state("");
	let imageUrl = $state("");
	let showLinkInput = $state(false);
	let showImageInput = $state(false);
	let isTableActive = $state(false);

	let tableElement;

	import { NodeView } from "@tiptap/core";

	import { Plugin, PluginKey, EditorState } from "prosemirror-state";
	import { Decoration, DecorationSet, type DecorationSource } from "prosemirror-view";
	import { Node } from "prosemirror-model";
	import type { Component } from "svelte";
	import type { EditorView } from "prosemirror-view";
	import type { SVGAttributes } from "svelte/elements";
	import MdiTableColumnPlusBefore from "~icons/mdi/table-column-plus-before";
	import MdiTableColumnPlusAfter from "~icons/mdi/table-column-plus-after";
	import MdiTableColumnRemove from "~icons/mdi/table-column-remove";
	import MdiTableRowPlusBefore from "~icons/mdi/table-row-plus-before";
	import MdiTableRowPlusAfter from "~icons/mdi/table-row-plus-after";
	import MdiTableRowRemove from "~icons/mdi/table-row-remove";
	import TableImproved from "./TableImproved";
	import TableBubbleMenu from "./TableBubbleMenu.svelte";

	// --------------------

	const CustomLinkExtension = Link.extend({
		inclusive: false
	});

	//---

	// Create a plugin key for our table controls
	const tableControlsKey = new PluginKey("tableControls");

	export const CustomTable = Table.extend({
		addProseMirrorPlugins() {
			const { editor } = this;

			return [
				...(this.parent?.() || []),
				new Plugin({
					key: tableControlsKey,
					props: {
						decorations(state: EditorState): DecorationSet {
							const { doc } = state;
							const decorations: Decoration[] = [];

							doc.descendants((node: ProseMirrorNode, pos: number) => {
								if (node.type.name === "table") {
									const decoration = Decoration.widget(
										pos,
										() => {
											// Create the controls container
											const controls = document.createElement("div");
											controls.className = "table-controls";

											// Add Row button
											const addButton = document.createElement("button");
											addButton.textContent = "Add Row";
											addButton.className = "table-control-button btn";
											addButton.onclick = (e) => {
												e.preventDefault(); // Prevent losing editor focus
												editor.commands.addRowBefore();
											};

											// Remove Row button
											const removeButton = document.createElement("button");
											removeButton.textContent = "Remove Row";
											removeButton.className = "table-control-button";
											removeButton.addEventListener("mousedown", (e) => {
												e.preventDefault(); // Prevent losing editor focus
												editor.commands.deleteRow();
											});

											controls.appendChild(addButton);
											controls.appendChild(removeButton);

											return controls;
										},
										{
											side: -1,
											stopEvent: () => true
										}
									);

									decorations.push(decoration);
								}
							});

							return DecorationSet.create(doc, decorations);
						}
					}
				})
			];
		}
	});

	// --------

	const CustomTable2 = Table.extend({
		addNodeView(): NodeViewRenderer {
			return (props: NodeViewRendererProps) => {
				// Create DOM elements
				const dom = document.createElement("div");
				const table = document.createElement("table");
				const controls = document.createElement("div");

				controls.className = "bg-base-200 rounded-lg shadow-lg mb-1 flex flex-row gap-1 justify-center items-center";
				dom.className = "table-wrapper";
				dom.appendChild(controls);
				dom.appendChild(table);

				const eventHandlers: { element: HTMLElement; handler: (event: Event) => void }[] = [];

				// Helper function to create buttons
				const createButton = (label: string, onClick: (event: Event) => void): HTMLButtonElement => {
					const button = document.createElement("button");
					button.textContent = label;
					button.className = "btn btn-sm btn-primary"; // Add your CSS framework classes
					button.addEventListener("click", onClick);
					eventHandlers.push({ element: button, handler: onClick }); // Track for cleanup
					return button;
				};

				controls.appendChild(
					createButton("Add Column", () => {
						$editor?.chain().focus().addColumnAfter().run();
					})
				);

				controls.appendChild(
					createButton("Remove Column", () => {
						$editor?.chain().focus().deleteColumn().run();
					})
				);

				controls.appendChild(
					createButton("Add Row", () => {
						$editor?.chain().focus().addRowAfter().run();
					})
				);

				controls.appendChild(
					createButton("Remove Row", () => {
						$editor?.chain().focus().deleteRow().run();
					})
				);

				// Return the NodeView object
				return {
					dom,
					contentDOM: table,
					destroy: () => {
						// Cleanup event listeners
						eventHandlers.forEach(({ element, handler }) => {
							element.removeEventListener("click", handler);
						});
					}
				};
			};
		}
	});

	function addRow() {
		$editor.chain().focus().addRowAfter().run();
	}

	function addColumn() {
		$editor.chain().focus().addColumnAfter().run();
	}

	onMount(() => {
		editor = createEditor({
			extensions: [
				CustomTable.configure({
					resizable: true
				}),
				Document,
				Paragraph,
				Text,
				TextStyle,
				Bold,
				Italic,
				Strike,
				Link.configure({
					openOnClick: true,
					linkOnPaste: true
				}),
				Image.configure({
					inline: true,
					allowBase64: true
				}),
				TextAlign.configure({
					types: ["paragraph"]
				}),
				StarterKit,
				ListItem,
				Heading.configure({
					levels: [1]
				}),

				CustomLinkExtension.configure({
					// autolink is generally useful for changing text into links if they
					// appear to be URLs (like someone types in literally "example.com"),
					// though it comes with the caveat that if you then *remove* the link
					// from the text, and then add a space or newline directly after the
					// text, autolink will turn the text back into a link again. Not ideal,
					// but probably still overall worth having autolink enabled, and that's
					// how a lot of other tools behave as well.
					autolink: true,
					linkOnPaste: true,
					openOnClick: false
				}),

				//  LinkBubbleMenuHandler,

				//  HeadingWithAnchor,

				TableCell,
				TableHeader,
				TableRow,
				Typography,
				Placeholder.configure({
					// Use a placeholder:
					placeholder: "Write something …"
				})
			],
			content: window.localStorage.getItem("editor-content"),
			onUpdate: ({ editor }) => {
				window.localStorage.setItem("editor-content", editor.getHTML());
			},
			onTransaction(props) {
				console.log("---- hm ---");
				console.dir(props.editor.state.selection);
				//		isTableActive = props.editor.state.selection.$anchor.node.type.name === "tableCell";
			},
			editorProps: {
				attributes: {
					class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-4 focus:outline-none"
				}
			}
		});
	});

	$effect(() => {
		return () => {
			$editor?.destroy();
		};
	});

	// Link handlers
	function setLink() {
		if (linkUrl) {
			$editor.chain().focus().setLink({ href: linkUrl }).run();
			linkUrl = "";
			showLinkInput = false;
		}
	}

	// Image handlers
	function addImage() {
		if (imageUrl) {
			$editor.chain().focus().setImage({ src: imageUrl }).run();
			imageUrl = "";
			showImageInput = false;
		}
	}

	let showAlignmentOptions = $state(false);
	let showListOptions = $state(false);

	// Table handlers
	const tableActions = {
		insertTable: () => $editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(),
		addColumnBefore: () => $editor.chain().focus().addColumnBefore().run(),
		addColumnAfter: () => $editor.chain().focus().addColumnAfter().run(),
		deleteColumn: () => $editor.chain().focus().deleteColumn().run(),
		addRowBefore: () => $editor.chain().focus().addRowBefore().run(),
		addRowAfter: () => $editor.chain().focus().addRowAfter().run(),
		deleteRow: () => $editor.chain().focus().deleteRow().run(),
		deleteTable: () => $editor.chain().focus().deleteTable().run()
	};
</script>

{#if $editor}
	<BubbleMenu
		tippyOptions={{ duration: 100 }}
		editor={$editor}
		class="flex justify-center items-center flex-wrap gap-1 p-1 rounded-lg bg-base-200 shadow-lg"
	>
		{#if showLinkInput}
			<input type="url" bind:value={linkUrl} placeholder="Enter URL" class="input input-bordered input-sm w-full" />
			<button class="btn btn-square btn-ghost ms-auto" onclick={setLink}>Add</button>
		{:else}
			<FormattingOptions editor={$editor} />

			<button
				class="btn btn-square btn-ghost"
				class:bg-primary={showListOptions}
				onclick={() => (showListOptions = !showListOptions)}
				aria-label="List Options">List</button
			>

			{#if showListOptions}
				<ListOptions editor={$editor} />
				<hr class="w-1 h-full border-t-2 border-slate-700" />
			{/if}

			<button
				class="btn btn-square btn-ghost"
				class:bg-primary={showAlignmentOptions}
				onclick={() => (showAlignmentOptions = !showAlignmentOptions)}
				aria-label="Alignment Options">Align</button
			>
			{#if showAlignmentOptions}
				<AlignmentOptions editor={$editor} />
			{/if}

			<button
				class="btn btn-square btn-ghost"
				onclick={() => $editor.chain().focus().unsetAllMarks().run()}
				aria-label="Clear Format"><MdiFormatClear /></button
			>

			<button
				class="btn btn-square btn-ghost"
				onclick={() => (showLinkInput = !showLinkInput)}
				class:bg-primary={showLinkInput}
				aria-label="Add Link"
			>
				<MdiLink />
			</button>
		{/if}

		<!-- Table Actions -->
		{#if isTableActive}
			<div class="absolute mt-2 p-2 bg-base-200 rounded-lg shadow-lg">
				<ul class="menu">
					<li><button onclick={tableActions.addColumnBefore}>Add Column Before</button></li>
					<li><button onclick={tableActions.addColumnAfter}>Add Column After</button></li>
					<li><button onclick={tableActions.deleteColumn}>Delete Column</button></li>
					<li><button onclick={tableActions.addRowBefore}>Add Row Before</button></li>
					<li><button onclick={tableActions.addRowAfter}>Add Row After</button></li>
					<li><button onclick={tableActions.deleteRow}>Delete Row</button></li>
					<li><button onclick={tableActions.deleteTable}>Delete Table</button></li>
				</ul>
			</div>
		{/if}
	</BubbleMenu>

	<FloatingMenu editor={$editor} tippyOptions={{ duration: 100 }}>
		<button
			class="btn btn-square btn-ghost"
			onclick={() => (showImageInput = !showImageInput)}
			class:bg-primary={showImageInput}
			aria-label="Add Image"
		>
			<MdiImagePlus />
		</button>
		{#if showImageInput}
			<input
				type="url"
				bind:value={imageUrl}
				placeholder="Enter Image URL"
				class="input input-bordered input-sm w-20"
			/>
			<button class="btn btn-square btn-ghost" onclick={addImage}>Add (Dialog)</button>
		{/if}

		<button class="btn btn-square btn-ghost" onclick={tableActions.insertTable} aria-label="Add Table">
			<MdiTablePlus />
		</button>
	</FloatingMenu>

	<!-- 	<LinkBubbleMenu /> -->
	<TableBubbleMenu editor={$editor} />

	<EditorContent editor={$editor} class="prose max-w-none p-4" />
{/if}

<style>
	:global(.ProseMirror) {
		outline: none;
		min-height: 200px;
	}
	:global(.ProseMirror table) {
		border-collapse: collapse;
		margin: 0;
		/*overflow: hidden; */
		table-layout: fixed;
		width: 100%;
	}
	:global(.ProseMirror td),
	:global(.ProseMirror th) {
		border: 4px solid hsl(var(--bc) / 0.2);
		box-sizing: border-box;
		min-width: 1em;
		padding: 3px 5px;
		position: relative;
		vertical-align: top;
	}
	:global(.ProseMirror th) {
		background-color: hsl(var(--b2));
		font-weight: bold;
	}
	:global(.ProseMirror ul),
	:global(.ProseMirror ol) {
		padding-left: 1.5rem;
	}

	:global(.ProseMirror > h2) {
		color: var(--bg-primary);
	}

	:global(.ProseMirror > h3) {
		color: var(--bg-secondary);
	}

	:global(.table-wrapper) {
		position: relative;
		margin: 1rem 0;
		padding-left: 2rem;
		padding-top: 2rem;
	}

	:global(.column-controls) {
		position: absolute;
		top: 0;
		left: 2rem;
		right: 0;
		display: flex;
		gap: 0;
	}

	:global(.col-control) {
		flex: 1;
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.25rem;
	}

	:global(.row-controls) {
		position: absolute;
		left: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.25rem;
		background: #f8f9fa;
		border: none !important;
	}

	:global(.row-controls button),
	:global(.col-control button) {
		width: 24px;
		height: 24px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
		color: #4b5563;
	}

	:global(.row-controls button:hover),
	:global(.col-control button:hover) {
		background: #f1f5f9;
		color: #1f2937;
	}

	:global(.ProseMirror) {
		outline: none;
	}

	:global(.ProseMirror table) {
		border-collapse: collapse;
		margin: 0;
		width: 100%;
		table-layout: fixed;
	}

	:global(.ProseMirror td, .ProseMirror th) {
		border: 2px solid #ced4da;
		padding: 0.5rem;
		position: relative;
		min-width: 100px;
	}

	:global(.ProseMirror th) {
		background: #f8f9fa;
		font-weight: bold;
	}
</style>
