<script lang="ts">
	import Tiptap from "$lib/component/Tiptap.svelte";

	import FluentEmojiFloppyDisk from "~icons/fluent-emoji/floppy-disk";
	import MdiWindowClose from "~icons/mdi/window-close";
	import FluentArrowHookUpLeft20Regular from "~icons/fluent/arrow-hook-up-left-20-regular";
	import FluentArrowHookUpRight20Regular from "~icons/fluent/arrow-hook-up-right-20-regular";
	import MdiCloseCircle from "~icons/mdi/close-circle";
	import { goto } from "$app/navigation";

	const { data } = $props();

	let publishModal: HTMLDialogElement;
	let cancelModal: HTMLDialogElement;

	import { Color } from "@tiptap/extension-color";
	import ListItem from "@tiptap/extension-list-item";
	import TextStyle from "@tiptap/extension-text-style";
	import Document from "@tiptap/extension-document";
	import Gapcursor from "@tiptap/extension-gapcursor";
	import Paragraph from "@tiptap/extension-paragraph";
	import Table from "@tiptap/extension-table";
	import TableCell from "@tiptap/extension-table-cell";
	import TableHeader from "@tiptap/extension-table-header";
	import TableRow from "@tiptap/extension-table-row";
	import Text from "@tiptap/extension-text";
	import BulletList from "@tiptap/extension-bullet-list";
	import OrderedList from "@tiptap/extension-ordered-list";

	import { onMount } from "svelte";
	import type { Readable } from "svelte/store";
	import { createEditor, Editor, EditorContent, BubbleMenu, FloatingMenu } from "svelte-tiptap";
	import StarterKit from "@tiptap/starter-kit";

	let editor = $state() as Readable<Editor>;

	onMount(() => {
		editor = createEditor({
			extensions: [
				Color.configure({ types: [TextStyle.name, ListItem.name] }),
				//	TextStyle.configure({ types: [ListItem.name] }),
				StarterKit,
				Document,
				Paragraph,
				Text,
				Gapcursor,
				Table.configure({
					resizable: true
				}),
				TableRow,
				TableHeader,
				TableCell,
				BulletList.configure({
					HTMLAttributes: {
						class: "list-disc ml-2"
					}
				}),
				OrderedList.configure({
					HTMLAttributes: {
						class: "list-decimal ml-2"
					}
				})
			],
			content: `
			  <h2>
				Hi there,
			  </h2>
			  <p>
				this is a <em>basic</em> example of <strong>Tiptap</strong>. Sure, there are all kind of basic text styles you’d probably expect from a text editor. But wait until you see the lists:
			  </p>
			  <ul>
				<li>
				  That’s a bullet list with one …
				</li>
				<li>
				  … or two list items.
				</li>
			  </ul>
			  <p>
				Isn’t that great? And all of that is editable. But wait, there’s more. Let’s try a code block:
			  </p>
			  <pre><code class="language-css">body {
	display: none;
  }</code></pre>
			  <p>
				I know, I know, this is impressive. It’s only the tip of the iceberg though. Give it a try and click a little bit around. Don’t forget to check the other examples too.
			  </p>
			  <blockquote>
				Wow, that’s amazing. Good work, boy! 👏
				<br />
				— Mom
			  </blockquote>
			`,
			editorProps: {
				attributes: {
					class: " appearance-none h-full    w-full p-2 bg-white text-black   leading-tight focus:outline-none "
				}
			}
		});
	});

	const isActive = (name: string, attrs = {}) => $editor.isActive(name, attrs);
</script>

<header class="sticky top-0 bg-base-100">
	<div class="flex p-2 space-x-2">
		<button onclick={() => publishModal.showModal()} class="btn btn-circle btn-ghost">
			<FluentEmojiFloppyDisk />
		</button>

		{#if editor}
			<button
				class="btn btn-circle"
				onclick={() => $editor.chain().focus().undo().run()}
				disabled={!$editor.can().chain().focus().undo().run()}
			>
				<FluentArrowHookUpLeft20Regular />
			</button>
			<button
				class="btn btn-circle"
				onclick={() => $editor.chain().focus().redo().run()}
				disabled={!$editor.can().chain().focus().redo().run()}
			>
				<FluentArrowHookUpRight20Regular />
			</button>
		{/if}

		<button onclick={() => cancelModal.showModal()} class="btn btn-circle btn-ghost ms-auto">
			<MdiWindowClose />
		</button>
	</div>

	<hr class="divide-gray-200 dark:divide-gray-700" />
</header>

<dialog class="modal" bind:this={publishModal}>
	<div class="modal-box">
		<form method="dialog">
			<button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2"><MdiWindowClose /></button>
		</form>
		<h3 class="text-lg font-bold">Are you ready to publish?</h3>

		<input class="w-full max-w-xs input" placeholder="Enter Title..." type="text" />

		{#if data.newspapers.length > 0}
			<label class="form-control w-full">
				Publish article as

				<select class="w-full max-w-sm select select-bordered">
					<option value="" selected disabled hidden>Select newspaper</option>
					{#each data.newspapers as newspaper}
						<option value={newspaper.id}>
							{newspaper.name}
						</option>
					{/each}
				</select>
			</label>
		{/if}

		<button class=" btn btn-primary">Publish article</button>
	</div>
</dialog>

<!-- todo: make this own componentn and also provide i18n to separeate header slot and children slot-->
<dialog class="modal" bind:this={cancelModal}>
	<div class="modal-box">
		<form method="dialog">
			<button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2"><MdiWindowClose /></button>
		</form>
		<h3 class="text-lg font-bold">Cancel!</h3>
		<p class="py-4">Press ESC key or click on ✕ button to close</p>

		<button class=" btn btn-primary" onclick={() => history.back()}>Revert changes</button>
	</div>
</dialog>

<EditorContent editor={$editor} />

{#if editor}
	<BubbleMenu
		class="flex w-fit max-w-[90vw] overflow-hidden rounded  bg-black shadow-xl p-1"
		tippyOptions={{ duration: 100 }}
		editor={$editor}
	>
		<div class="control-group">
			<div class="button-group">
				<button
					onclick={() => $editor.chain().focus().toggleBold().run()}
					disabled={!$editor.can().chain().focus().toggleBold().run()}
					class={isActive("bold") ? "border  border-yellow-300 m-4" : ""}
				>
					Bold
				</button>

				<button
					onclick={() => $editor.chain().focus().toggleItalic().run()}
					disabled={!$editor.can().chain().focus().toggleItalic().run()}
					class={isActive("italic") ? "is-active" : ""}
				>
					Italic
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleStrike().run()}
					disabled={!$editor.can().chain().focus().toggleStrike().run()}
					class={isActive("strike") ? "is-active" : ""}
				>
					Strike
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleCode().run()}
					disabled={!$editor.can().chain().focus().toggleCode().run()}
					class={isActive("code") ? "is-active" : ""}
				>
					Code
				</button>
				<button onclick={() => $editor.chain().focus().unsetAllMarks().run()}>Clear marks</button>
				<button onclick={() => $editor.chain().focus().clearNodes().run()}>Clear nodes</button>
				<button
					onclick={() => $editor.chain().focus().setParagraph().run()}
					class={isActive("paragraph") ? "is-active" : ""}
				>
					Paragraph
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleHeading({ level: 1 }).run()}
					class={isActive("heading", { level: 1 }) ? "is-active" : ""}
				>
					H1
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleHeading({ level: 2 }).run()}
					class={isActive("heading", { level: 2 }) ? "is-active" : ""}
				>
					H2
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleHeading({ level: 3 }).run()}
					class={isActive("heading", { level: 3 }) ? "is-active" : ""}
				>
					H3
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleHeading({ level: 4 }).run()}
					class={isActive("heading", { level: 4 }) ? "is-active" : ""}
				>
					H4
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleHeading({ level: 5 }).run()}
					class={isActive("heading", { level: 5 }) ? "is-active" : ""}
				>
					H5
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleHeading({ level: 6 }).run()}
					class={isActive("heading", { level: 6 }) ? "is-active" : ""}
				>
					H6
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleBulletList().run()}
					class={isActive("bulletList") ? "is-active" : ""}
				>
					Bullet list
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleOrderedList().run()}
					class={isActive("orderedList") ? "is-active" : ""}
				>
					Ordered list
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleCodeBlock().run()}
					class={isActive("codeBlock") ? "is-active" : ""}
				>
					Code block
				</button>
				<button
					onclick={() => $editor.chain().focus().toggleBlockquote().run()}
					class={isActive("blockquote") ? "is-active" : ""}
				>
					Blockquote
				</button>
				<button onclick={() => $editor.chain().focus().setHorizontalRule().run()}> Horizontal rule </button>
				<button onclick={() => $editor.chain().focus().setHardBreak().run()}>Hard break</button>

				<button
					onclick={() => $editor.chain().focus().setColor("#958DF1").run()}
					class={isActive("textStyle", { color: "#958DF1" }) ? "is-active" : ""}
				>
					Purple
				</button>
			</div>
		</div>
	</BubbleMenu>
{/if}
