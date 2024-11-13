<script lang="ts">
	import { createEditor } from "svelte-editorjs";
	//	import YoutubeEmbed from "editorjs-youtube-embed";
	/*	import Table from "editorjs-table";
	import Undo from "editorjs-undo";
	@tsignore
*/ import TextSpolier from "editorjs-inline-spoiler-tool";
	/*	import Marker from "@editorjs/marker";
	import SimpleImage from "simple-image-editorjs";
*/ import TelegramPost from "editorjs-telegram-post";

	const { editor, data, isReady } = createEditor({
		tools: {
			telegramPost: TelegramPost.default
		},
		autofocus: true,
		onReady: () => {
			console.log("Editor.js is ready!");
		},
		onChange: async () => {
			const content = await editor.save();
			console.log("Content:", content);
		}
	});

	//var editor = EditorJS({
	//	youtubeEmbed: YoutubeEmbed,
	//	TextSpolier: TextSpolier.default
	/*	telegramPost: TelegramPost.default,
		Table: Table.default,
		Marker: {
			class: Marker,
			shortcut: "CMD+SHIFT+M"
		},
		image: SimpleImage.default */
	//});
	/*	editor.onReady = () => {
		new Undo({ editor });
	}; */
</script>

<div use:editor></div>
<button on:click={() => $editor.clear()}>Clear contents</button>
<button on:click={() => $editor.save()}>Save contents</button>
