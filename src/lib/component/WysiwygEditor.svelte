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
	//import Color from "@tiptap/extension-color";

	import { onMount, onDestroy } from "svelte";
	import type { Readable } from "svelte/store";
	import { createEditor, Editor, EditorContent, BubbleMenu } from "svelte-tiptap";

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

	let editor = $state() as Readable<Editor>;
	let showToolbar = $state(false);

	onMount(() => {
		editor = createEditor({
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
				//	Color.configure({ types: [TextStyle.name, ListItem.name] }),
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
					class: "prose prose-sm sm:prose max-w-none focus:outline-none min-h-[300px] p-3 sm:p-4"
				}
			},
			onUpdate: ({ editor }) => {
				if (onContentChange) {
					onContentChange(editor.getHTML());
				}
			}
		});
	});

	onDestroy(() => {
		if ($editor) {
			$editor.destroy();
		}
	});

	// Public methods
	export const getContent = () => $editor?.getHTML() || "";
	export const setContent = (content: string) => $editor?.commands.setContent(content);
	export const clearContent = () => $editor?.commands.clearContent();
	export const undo = () => $editor?.chain().focus().undo().run();
	export const redo = () => $editor?.chain().focus().redo().run();

	const isActive = (name: string, attrs = {}) => $editor?.isActive(name, attrs) || false;
</script>

<div class="wysiwyg-editor border rounded-lg bg-base-100">
	<!-- Mobile Toolbar Toggle -->
	<div class="sm:hidden border-b p-2">
		<button class="btn btn-sm btn-block btn-ghost" onclick={() => (showToolbar = !showToolbar)}>
			{showToolbar ? "Hide" : "Show"} Formatting
		</button>
	</div>

	<!-- Toolbar -->
	<div class="border-b p-2 {showToolbar || 'hidden'} sm:block">
		<div class="flex flex-wrap gap-1">
			<!-- Text Formatting -->
			<div class="btn-group">
				<button
					class="btn btn-xs sm:btn-sm {isActive('bold') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleBold().run()}
					disabled={!$editor?.can().chain().focus().toggleBold().run()}
					title="Bold"
				>
					<MdiFormatBold class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm {isActive('italic') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleItalic().run()}
					disabled={!$editor?.can().chain().focus().toggleItalic().run()}
					title="Italic"
				>
					<MdiFormatItalic class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm {isActive('strike') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleStrike().run()}
					disabled={!$editor?.can().chain().focus().toggleStrike().run()}
					title="Strikethrough"
				>
					<MdiFormatStrikethrough class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm {isActive('code') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleCode().run()}
					disabled={!$editor?.can().chain().focus().toggleCode().run()}
					title="Inline Code"
				>
					<MdiCodeTags class="w-4 h-4" />
				</button>
			</div>

			<!-- Headings -->
			<div class="btn-group">
				<button
					class="btn btn-xs sm:btn-sm {isActive('heading', { level: 1 }) ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleHeading({ level: 1 }).run()}
					title="Heading 1"
				>
					<MdiFormatHeader1 class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm {isActive('heading', { level: 2 }) ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleHeading({ level: 2 }).run()}
					title="Heading 2"
				>
					<MdiFormatHeader2 class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm {isActive('heading', { level: 3 }) ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleHeading({ level: 3 }).run()}
					title="Heading 3"
				>
					<MdiFormatHeader3 class="w-4 h-4" />
				</button>
			</div>

			<!-- Lists -->
			<div class="btn-group">
				<button
					class="btn btn-xs sm:btn-sm {isActive('bulletList') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleBulletList().run()}
					title="Bullet List"
				>
					<MdiFormatListBulleted class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm {isActive('orderedList') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleOrderedList().run()}
					title="Numbered List"
				>
					<MdiFormatListNumbered class="w-4 h-4" />
				</button>
			</div>

			<!-- Blocks -->
			<div class="btn-group">
				<button
					class="btn btn-xs sm:btn-sm {isActive('blockquote') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleBlockquote().run()}
					title="Blockquote"
				>
					<MdiFormatQuoteClose class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm {isActive('codeBlock') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleCodeBlock().run()}
					title="Code Block"
				>
					<MdiCodeTags class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs sm:btn-sm"
					onclick={() => $editor?.chain().focus().setHorizontalRule().run()}
					title="Horizontal Rule"
				>
					<MdiMinus class="w-4 h-4" />
				</button>
			</div>

			<!-- Table -->
			<button
				class="btn btn-xs sm:btn-sm"
				onclick={() => $editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
				title="Insert Table"
			>
				<MdiTable class="w-4 h-4" />
			</button>
		</div>
	</div>

	<!-- Editor Content -->
	<div class="relative">
		{#if editor}
			<EditorContent editor={$editor} />

			<!-- Bubble Menu for Text Selection (Desktop) -->
			<BubbleMenu
				class="hidden sm:flex gap-1 bg-base-300 shadow-lg rounded-lg p-1"
				tippyOptions={{ duration: 100 }}
				editor={$editor}
			>
				<button
					class="btn btn-xs {isActive('bold') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleBold().run()}
					title="Bold"
				>
					<MdiFormatBold class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs {isActive('italic') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleItalic().run()}
					title="Italic"
				>
					<MdiFormatItalic class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs {isActive('strike') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleStrike().run()}
					title="Strikethrough"
				>
					<MdiFormatStrikethrough class="w-4 h-4" />
				</button>
				<button
					class="btn btn-xs {isActive('code') ? 'btn-active' : ''}"
					onclick={() => $editor?.chain().focus().toggleCode().run()}
					title="Code"
				>
					<MdiCodeTags class="w-4 h-4" />
				</button>
			</BubbleMenu>
		{/if}

		{#if !$editor?.state.doc.textContent && placeholder}
			<div class="absolute top-3 left-3 sm:top-4 sm:left-4 text-gray-400 pointer-events-none">
				{placeholder}
			</div>
		{/if}
	</div>
</div>
