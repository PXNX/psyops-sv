<!-- src/lib/component/WysiwygEditor.svelte -->
<script lang="ts">
	import ListItem from "@tiptap/extension-list-item";
	import { TextStyle } from "@tiptap/extension-text-style";
	import Document from "@tiptap/extension-document";
	import Gapcursor from "@tiptap/extension-gapcursor";
	import Paragraph from "@tiptap/extension-paragraph";
	import { Table } from "@tiptap/extension-table";
	import TableCell from "@tiptap/extension-table-cell";
	import TableHeader from "@tiptap/extension-table-header";
	import TableRow from "@tiptap/extension-table-row";
	import Text from "@tiptap/extension-text";
	import BulletList from "@tiptap/extension-bullet-list";
	import OrderedList from "@tiptap/extension-ordered-list";
	import Blockquote from "@tiptap/extension-blockquote";
	import CodeBlock from "@tiptap/extension-code-block";
	import HorizontalRule from "@tiptap/extension-horizontal-rule";
	import Bold from "@tiptap/extension-bold";
	import Italic from "@tiptap/extension-italic";
	import Strike from "@tiptap/extension-strike";
	import Code from "@tiptap/extension-code";
	import Heading from "@tiptap/extension-heading";
	import History from "@tiptap/extension-history";
	import Image from "@tiptap/extension-image";
	import Link from "@tiptap/extension-link";

	import { onMount, onDestroy } from "svelte";
	import type { Component } from "svelte";
	import ToolbarButton from "#lib/component/ui/ToolbarButton.svelte";
	import Modal from "#lib/component/Modal.svelte";
	import { Button } from "#lib/component/ui/index.js";
	import { Editor, EditorContent, BubbleMenu } from "svelte-tiptap";
	import { isSafeHttpUrl, isSafeLinkUrl } from "#lib/utils/url-safety.js";
	import { youtubeId } from "#lib/utils/post-diagrams.js";

	import MdiFormatBold from "~icons/mdi/format-bold";
	import MdiFormatItalic from "~icons/mdi/format-italic";
	import MdiFormatStrikethrough from "~icons/mdi/format-strikethrough";
	import MdiCodeTags from "~icons/mdi/code-tags";
	import MdiChartGantt from "~icons/mdi/chart-gantt";
	import MdiFormatHeader1 from "~icons/mdi/format-header-1";
	import MdiFormatHeader2 from "~icons/mdi/format-header-2";
	import MdiFormatHeader3 from "~icons/mdi/format-header-3";
	import MdiFormatListBulleted from "~icons/mdi/format-list-bulleted";
	import MdiFormatListNumbered from "~icons/mdi/format-list-numbered";
	import MdiFormatQuoteClose from "~icons/mdi/format-quote-close";
	import MdiMinus from "~icons/mdi/minus";
	import MdiTable from "~icons/mdi/table";
	import MdiImage from "~icons/mdi/image";
	import MdiLink from "~icons/mdi/link";

	interface Props {
		initialContent?: string;
		placeholder?: string;
		onContentChange?: (content: string) => void;
	}

	let { initialContent = "", placeholder = "Start writing...", onContentChange }: Props = $props();

	let editor = $state<Editor>();
	let _transaction = $state(0);

	// Insert-by-URL dialog, used for both remote images and links.
	type InsertKind = "image" | "link" | "video";
	let insertKind = $state<InsertKind>("image");
	let insertOpen = $state(false);
	let urlInput = $state("");
	let urlError = $state("");

	function openInsert(kind: InsertKind) {
		insertKind = kind;
		urlInput = "";
		urlError = "";
		insertOpen = true;
	}

	function insertUrl() {
		const url = urlInput.trim();
		if (!editor) return;

		if (insertKind === "image") {
			if (!isSafeHttpUrl(url)) {
				urlError = "Enter a full http:// or https:// image URL.";
				return;
			}
			editor.chain().focus().setImage({ src: url, alt: "" }).run();
		} else if (insertKind === "video") {
			if (!youtubeId(url)) {
				urlError = "Enter a YouTube watch or share link.";
				return;
			}
			editor
				.chain()
				.focus()
				.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
				.run();
		} else {
			if (!isSafeLinkUrl(url)) {
				urlError = "Enter an http(s), mailto: or relative (/) link.";
				return;
			}
			const { empty } = editor.state.selection;
			if (empty) {
				editor
					.chain()
					.focus()
					.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
					.run();
			} else {
				editor.chain().focus().setLink({ href: url }).run();
			}
		}
		insertOpen = false;
	}

	let isEditorEmpty = $derived.by(() => {
		void _transaction;
		return !editor?.state.doc.textContent;
	});

	onMount(() => {
		editor = new Editor({
			extensions: [
				Document,
				Paragraph,
				Text,
				Gapcursor,
				History,
				Bold,
				Italic,
				Strike,
				Code,
				TextStyle,
				Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
				BulletList.configure({
					HTMLAttributes: { class: "list-disc ml-6" }
				}),
				OrderedList.configure({
					HTMLAttributes: { class: "list-decimal ml-6" }
				}),
				ListItem,
				Blockquote,
				CodeBlock.configure({
					HTMLAttributes: { class: "bg-surface-4 p-4 rounded-sm" }
				}),
				HorizontalRule,
				Table.configure({ resizable: true }),
				TableRow,
				TableHeader,
				TableCell,
				// Images are always remote — no local upload, no base64 payloads.
				Image.configure({
					inline: false,
					allowBase64: false,
					HTMLAttributes: {
						loading: "lazy",
						decoding: "async",
						referrerpolicy: "no-referrer"
					}
				}),
				Link.configure({
					openOnClick: false,
					autolink: true,
					protocols: ["http", "https", "mailto"],
					HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" }
				})
			],
			content: initialContent,
			editorProps: {
				attributes: {
					class:
						"prose prose-sm sm:prose prose-invert max-w-none focus:outline-none min-h-[220px] py-3 sm:min-h-[300px] sm:py-4"
				}
			},
			onUpdate: ({ editor: e }) => {
				if (onContentChange) {
					onContentChange(e.getHTML());
				}
			},
			onTransaction: () => {
				_transaction++;
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	// Public methods
	export const getContent = () => editor?.getHTML() || "";
	export const setContent = (content: string) => editor?.commands.setContent(content);
	export const clearContent = () => editor?.commands.clearContent();
	export const undo = () => editor?.chain().focus().undo().run();
	export const redo = () => editor?.chain().focus().redo().run();

	const isActive = (name: string, attrs = {}) => {
		void _transaction;
		return editor?.isActive(name, attrs) || false;
	};

	interface ToolbarItem {
		icon: Component;
		label: string;
		run: () => void;
		active?: () => boolean;
		enabled?: () => boolean;
	}

	// Inline marks are shown both in the toolbar and in the selection bubble menu.
	const inlineMarks: ToolbarItem[] = [
		{
			icon: MdiFormatBold,
			label: "Bold",
			run: () => editor?.chain().focus().toggleBold().run(),
			active: () => isActive("bold"),
			enabled: () => editor?.can().chain().focus().toggleBold().run() ?? false
		},
		{
			icon: MdiFormatItalic,
			label: "Italic",
			run: () => editor?.chain().focus().toggleItalic().run(),
			active: () => isActive("italic"),
			enabled: () => editor?.can().chain().focus().toggleItalic().run() ?? false
		},
		{
			icon: MdiFormatStrikethrough,
			label: "Strikethrough",
			run: () => editor?.chain().focus().toggleStrike().run(),
			active: () => isActive("strike"),
			enabled: () => editor?.can().chain().focus().toggleStrike().run() ?? false
		},
		{
			icon: MdiCodeTags,
			label: "Inline Code",
			run: () => editor?.chain().focus().toggleCode().run(),
			active: () => isActive("code"),
			enabled: () => editor?.can().chain().focus().toggleCode().run() ?? false
		}
	];

	const headings: ToolbarItem[] = [
		{ icon: MdiFormatHeader1, label: "Heading 1", level: 1 },
		{ icon: MdiFormatHeader2, label: "Heading 2", level: 2 },
		{ icon: MdiFormatHeader3, label: "Heading 3", level: 3 }
	].map(({ icon, label, level }) => ({
		icon,
		label,
		run: () =>
			editor
				?.chain()
				.focus()
				.toggleHeading({ level: level as 1 | 2 | 3 })
				.run(),
		active: () => isActive("heading", { level })
	}));

	const lists: ToolbarItem[] = [
		{
			icon: MdiFormatListBulleted,
			label: "Bullet List",
			run: () => editor?.chain().focus().toggleBulletList().run(),
			active: () => isActive("bulletList")
		},
		{
			icon: MdiFormatListNumbered,
			label: "Numbered List",
			run: () => editor?.chain().focus().toggleOrderedList().run(),
			active: () => isActive("orderedList")
		}
	];

	const blocks: ToolbarItem[] = [
		{
			icon: MdiFormatQuoteClose,
			label: "Blockquote",
			run: () => editor?.chain().focus().toggleBlockquote().run(),
			active: () => isActive("blockquote")
		},
		{
			icon: MdiCodeTags,
			label: "Code Block",
			run: () => editor?.chain().focus().toggleCodeBlock().run(),
			active: () => isActive("codeBlock")
		},
		{
			icon: MdiChartGantt,
			label: "Mermaid diagram",
			run: () => editor?.chain().focus().toggleCodeBlock({ language: "mermaid" }).run(),
			active: () => isActive("codeBlock") && editor?.getAttributes("codeBlock").language === "mermaid"
		},
		{
			icon: MdiMinus,
			label: "Horizontal Rule",
			run: () => editor?.chain().focus().setHorizontalRule().run()
		},
		{
			icon: MdiTable,
			label: "Insert Table",
			run: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
		}
	];

	const inserts: ToolbarItem[] = [
		{ icon: MdiImage, label: "Insert image from URL", run: () => openInsert("image") },
		{ icon: MdiChartGantt, label: "Embed YouTube video", run: () => openInsert("video") },
		{ icon: MdiLink, label: "Insert link", run: () => openInsert("link") }
	];

	const toolbarGroups: ToolbarItem[][] = [inlineMarks, headings, lists, blocks, inserts];
</script>

<div class="wysiwyg-editor">
	<!-- Toolbar: a single swipeable row on mobile (sticky below the top bar),
	     grouped as normal on larger screens. -->
	<div
		class="sticky top-14 z-5 mb-2 border-b border-line/15 bg-surface-0/95 pb-2 backdrop-blur-sm sm:static sm:bg-transparent sm:backdrop-blur-none"
	>
		<div
			class="flex flex-nowrap items-center gap-0.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:gap-1 sm:overflow-visible sm:pb-0"
		>
			{#each toolbarGroups as group, i (i)}
				{#if i > 0}
					<div class="mx-0.5 h-6 w-px shrink-0 bg-line/15 sm:mx-1"></div>
				{/if}
				<div class="flex items-center gap-0.5">
					{#each group as item (item.label)}
						<ToolbarButton
							icon={item.icon}
							label={item.label}
							active={item.active?.() ?? false}
							disabled={item.enabled ? !item.enabled() : false}
							onclick={item.run}
						/>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<!-- Editor Content -->
	<div class="relative">
		{#if editor}
			<EditorContent {editor} />

			<!-- Bubble Menu for Text Selection -->
			<BubbleMenu
				class="flex gap-0.5 rounded-sm border border-line/15 bg-surface-6 p-1 shadow-xl"
				tippyOptions={{ duration: 100 }}
				{editor}
			>
				{#each inlineMarks as item (item.label)}
					<ToolbarButton
						icon={item.icon}
						label={item.label}
						size="xs"
						active={item.active?.() ?? false}
						onclick={item.run}
					/>
				{/each}
			</BubbleMenu>
		{/if}

		{#if isEditorEmpty && placeholder}
			<div class="pointer-events-none absolute top-3 left-0 text-fg-muted sm:top-4">
				{placeholder}
			</div>
		{/if}
	</div>
</div>

<!-- Remote image / link insertion. Images are embedded by URL only. -->
<Modal bind:open={insertOpen} title={insertKind === "image" ? "Insert image" : insertKind === "video" ? "Embed YouTube video" : "Insert link"} size="small">
	<form
		class="space-y-3"
		onsubmit={(e) => {
			e.preventDefault();
			insertUrl();
		}}
	>
		<label class="field-label" for="insert-url">
			{insertKind === "image" ? "Image URL" : insertKind === "video" ? "YouTube URL" : "Link URL"}
		</label>
		<input
			id="insert-url"
			class="field-control w-full rounded-sm px-3 py-2.5 text-base sm:py-2 sm:text-sm"
			type="url"
			inputmode="url"
			bind:value={urlInput}
			placeholder={insertKind === "image"
				? "https://example.com/photo.jpg"
				: insertKind === "video"
					? "https://youtu.be/..."
					: "https://example.com"}
			autocomplete="off"
			oninput={() => (urlError = "")}
			onkeydown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					insertUrl();
				}
			}}
		/>
		<p class="text-xs text-fg-muted">
			{#if insertKind === "image"}
				Paste a public http(s) image address. The image is loaded from that site, never uploaded here.
			{:else}
				http(s), mailto: and relative links are supported.
			{/if}
		</p>
		{#if urlError}
			<p class="field-error">{urlError}</p>
		{/if}
		<div class="flex justify-end gap-2 pt-1">
			<Button type="button" variant="secondary" onclick={() => (insertOpen = false)}>Cancel</Button>
			<Button type="submit" variant="primary">Insert</Button>
		</div>
	</form>
</Modal>
