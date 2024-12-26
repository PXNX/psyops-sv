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

	const newspaper = {
		name: "Newspaper",
		avatar: "https://picsum.photos/id/10/200/200",
		background: "https://picsum.photos/id/10/200/200"
	};
</script>

<div class="m-2 h-full flex flex-col gap-2 justify-center items-center">
	<div class="rounded-lg border border-base-200 w-full overflow-clip bg-blue-800">
		<div class="relative h-40">
			<img src={newspaper.background} alt="Newspaper background" class="object-cover w-full h-40" />
		</div>
		<div class="p-4">
			<div class="flex items-center space-x-4">
				<div class="relative w-16 h-16 rounded-full overflow-hidden">
					<img src={newspaper.avatar} alt="Newspaper avatar" class="object-cover" />
				</div>
				<h2 class="text-2xl font-bold">{newspaper.name}</h2>
			</div>
		</div>
	</div>

	<!-- 
		<select class="w-full max-w-sm select select-bordered">
			<option value="" selected disabled hidden>Category or language??</option>
			<option value="dark">Dark</option>
			<option value="light">Light</option>
			<option value="cupcake">Pink</option>
			<option value="retro">Retro</option>
		</select> -->

	<form method="POST" use:enhance class="fieldset w-full flex flex-col border border-base-200 rounded-lg p-4">
		<h2 class="text-xl font-bold">Edit Newspaper</h2>

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
