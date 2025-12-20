<script lang="ts">
	import { m } from "$lib/paraglide/messages.js";

	import { enhance } from "$app/forms";
	import type { ActionData } from "./$types";

	export let form: ActionData;

	let file: File | null = null;
	let previewUrl = "";

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;

		if (files && files[0]) {
			file = files[0];
			previewUrl = URL.createObjectURL(file);
		}
	}
</script>

{m.training()}

<div>
	<h1>Upload Image to Backblaze B2</h1>

	<form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance>
		<div>
			<label for="file-input">Choose an image</label>
			<input id="file-input" name="file" type="file" accept="image/*" on:change={handleFileChange} required />
		</div>

		{#if previewUrl}
			<div>
				<img src={previewUrl} alt="Preview" width="300" />
			</div>
		{/if}

		<button type="submit">Upload Image</button>
	</form>

	{#if form?.error}
		<div>
			<p>Error: {form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div>
			<p>✅ Upload successful!</p>
			<p>File: {form.fileName}</p>
			<a href={form.url} target="_blank" rel="noopener noreferrer">View uploaded image</a>
			<div>
				<code>{form.url}</code>
			</div>
		</div>
	{/if}
</div>
