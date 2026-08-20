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

	import { onMount, onDestroy } from "svelte";
	import type { Component } from "svelte";
	import ToolbarButton from "$lib/component/ui/ToolbarButton.svelte";
	import { Editor, EditorContent, BubbleMenu } from "svelte-tiptap";

	import MdiFormatBold from "~icons/mdi/format-bold";
	import MdiFormatItalic from "~icons/mdi/format-italic";
	import MdiFormatStrikethrough from "~icons/mdi/format-strikethrough";
	import MdiCodeTags from "~icons/mdi/code-tags";
	import MdiFormatHeader1 from "~icons/mdi/format-header-1";
	import MdiFormatHeader2 from "~icons/mdi/format-header-2";
	import MdiFormatHeader3 from "~icons/mdi/format-header-3";
	import MdiFormatListBulleted from "~icons/mdi/format-list-bulleted";
	import MdiFormatListNumbered from "~icons/mdi/format-list-numbered";
	import MdiFormatQuoteClose from "~icons/mdi/format-quote-close";
	import MdiMinus from "~icons/mdi/minus";
	import MdiTable from "~icons/mdi/table";

	interface Props {
		initialContent?: string;
		placeholder?: string;
		onContentChange?: (content: string) => void;
	}

	let { initialContent = "", placeholder = "Start writing...", onContentChange }: Props = $props();

	let editor = $state<Editor>();
	let _transaction = $state(0);

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
					HTMLAttributes: { class: "bg-base-200 p-4 rounded-lg" }
				}),
				HorizontalRule,
				Table.configure({ resizable: true }),
				TableRow,
				TableHeader,
				TableCell
			],
			content: initialContent,
			editorProps: {
				attributes: {
					class: "prose prose-sm sm:prose prose-invert max-w-none focus:outline-none min-h-[300px] py-3 sm:py-4"
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
		run: () => editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run(),
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

	const toolbarGroups: ToolbarItem[][] = [inlineMarks, headings, lists, blocks];
</script>
<div class="wysiwyg-editor">
	<!-- Toolbar -->
	<div class="mb-2 border-b border-slate-700/50 pb-2">
		<div class="flex flex-wrap items-center gap-1">
			{#each toolbarGroups as group, i (i)}
				{#if i > 0}
					<div class="mx-1 h-6 w-px bg-slate-700/50"></div>
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

			<!-- Bubble Menu for Text Selection (Desktop) -->
			<BubbleMenu
				class="hidden gap-0.5 rounded-lg border border-white/10 bg-slate-800 p-1 shadow-xl sm:flex"
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
			<div class="pointer-events-none absolute top-3 left-0 text-slate-600 sm:top-4">
				{placeholder}
			</div>
		{/if}
	</div>
</div>
