<script>
	import { superForm } from "sveltekit-superforms";

	let { data } = $props();

	// Client API:
	const { form, enhance, delayed, submitting, timeout } = superForm(data.form);
</script>

<div class="mx-4 mt-4 mb-12 space-y-4 w-full flex flex-col">
	<h2 class="text-xl font-bold">Create Newspaper</h2>

	<form class="w-full space-y-4 form-control" id="publish_article" method="POST" use:enhance>
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
				bind:value={$form.name}
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
				bind:value={$form.avatar}
			/>
		</label>

		<button class="btn btn-primary">
			{#if $submitting}<img src="https://w5.giffitsstatic.com/pics/c504/342435_1.jpg" alt="" />{/if} Create newspaper
		</button>
	</form>
</div>
