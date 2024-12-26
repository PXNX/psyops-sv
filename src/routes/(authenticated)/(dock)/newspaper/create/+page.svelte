<script>
	import { Control, Field, FieldErrors, Label } from "formsnap";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
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

<div class="m-4 h-full flex flex-col gap-2 justify-center items-center">
	<FluentEmojiRolledUpNewspaper class="size-12 " />
	<h2 class="text-xl font-bold">Create Newspaper</h2>

	<!-- 
		<select class="w-full max-w-sm select select-bordered">
			<option value="" selected disabled hidden>Category or language??</option>
			<option value="dark">Dark</option>
			<option value="light">Light</option>
			<option value="cupcake">Pink</option>
			<option value="retro">Retro</option>
		</select> -->

	<form method="POST" use:enhance class="fieldset w-sm flex flex-col">
		<Field {form} name="name">
			<Control>
				{#snippet children({ props })}
					<Label class="fieldset-label">Name</Label>
					<input {...props} bind:value={$formData.name} class="input w-full" />
				{/snippet}
			</Control>

			<FieldErrors class="text-warning" />
		</Field>
		<Field {form} name="avatar">
			<Control>
				{#snippet children({ props })}
					<Label class="fieldset-label">Avatar</Label>
					<input {...props} bind:value={$formData.avatar} class="input w-full" />
				{/snippet}
			</Control>

			<FieldErrors class="text-warning" />
		</Field>
		<Field {form} name="background">
			<Control>
				{#snippet children({ props })}
					<Label class="fieldset-label">Background</Label>
					<input {...props} type="url" bind:value={$formData.background} class="input w-full" />
				{/snippet}
			</Control>

			<FieldErrors class="text-warning" />
		</Field>

		<button class="btn btn-primary" disabled={$delayed || $submitting} type="submit">
			{#if $submitting}
				<span class="loading loading-spinner"></span>{/if} Create newspaper
		</button>
	</form>

	<!--<SuperDebug data={$formData} />-->
</div>
