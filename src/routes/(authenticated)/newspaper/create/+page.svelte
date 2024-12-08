<script>
	import { Editor } from "novel-svelte";
	import Tiptap from "$lib/component/Tiptap.svelte";

	import FluentEmojiLeftArrow from "~icons/fluent-emoji/left-arrow";
	import FluentEmojiFloppyDisk from "~icons/fluent-emoji/floppy-disk";
	import MdiWindowClose from "~icons/mdi/window-close";
	import { goto } from "$app/navigation";

	let pushblishModal = $state();
	let cancelModal = $state();
</script>

<div class="mx-4 mt-4 mb-12 space-y-4">
	<div class="flex justify-between w-full gap-2">
		<h2 class="text-xl font-bold">Create Newspaper</h2>

		<button class="btn btn-circle" onclick={() => history.back()}>
			<img alt="" class="w-6 h-6" src="/dist/window-close.svg" />
		</button>
	</div>

	<form class="w-full space-y-4 form-control" id="publish_article">
		<select class="w-full max-w-sm select select-bordered">
			<option value="dark">Category or language??</option>
			<option value="light">Light</option>
			<option value="cupcake">Pink</option>
			<option value="retro">Retro</option>
		</select>

		<label
			>Newspaper name
			<input
				class="w-full max-w-sm input input-bordered"
				name="newspaper_name"
				placeholder="Newspaper name"
				required
				type="text"
			/>
		</label>

		<label
			>Newspaper avatar url
			<input
				class="w-full max-w-sm input input-bordered"
				name="newspaper_avatar"
				placeholder="Avatar Url"
				required
				type="text"
			/>
		</label>

		<button class="btn btn-primary">Create newspaper</button>
	</form>
</div>
