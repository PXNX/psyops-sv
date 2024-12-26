<script>
	import { Control, Field, FieldErrors, Label } from "formsnap";
	import { superForm } from "sveltekit-superforms";
	import { valibotClient } from "sveltekit-superforms/adapters";
	import SuperDebug from "sveltekit-superforms";
	import { newspaperSchema } from "./schema";
	let { data } = $props();

	const form = superForm(data.form, {
		validators: valibotClient(newspaperSchema)
	});
	const { form: formData, enhance, delayed, submitting, timeout } = form;
</script>

<div class="mx-4 mt-4 mb-12 space-y-4 w-full flex flex-col">
	<h2 class="text-xl font-bold">Create Newspaper</h2>

	<!-- 
		<select class="w-full max-w-sm select select-bordered">
			<option value="" selected disabled hidden>Category or language??</option>
			<option value="dark">Dark</option>
			<option value="light">Light</option>
			<option value="cupcake">Pink</option>
			<option value="retro">Retro</option>
		</select> -->

	<form method="POST" use:enhance>
		<Field {form} name="name">
			<Control>
				{#snippet children({ props })}
					<Label>Name</Label>
					<input {...props} bind:value={$formData.name} />
				{/snippet}
			</Control>

			<FieldErrors />
		</Field>
		<Field {form} name="avatar">
			<Control>
				{#snippet children({ props })}
					<Label>Avatar</Label>
					<input {...props} bind:value={$formData.avatar} />
				{/snippet}
			</Control>

			<FieldErrors />
		</Field>
		<Field {form} name="background">
			<Control>
				{#snippet children({ props })}
					<Label>Background</Label>
					<input {...props} type="url" bind:value={$formData.background} />
				{/snippet}
			</Control>

			<FieldErrors />
		</Field>

		<button class="btn btn-primary w-full">
			{#if $submitting}<img src="https://w5.giffitsstatic.com/pics/c504/342435_1.jpg" alt="" />{/if} Create newspaper
		</button>
	</form>

	<SuperDebug data={$formData} />
</div>
