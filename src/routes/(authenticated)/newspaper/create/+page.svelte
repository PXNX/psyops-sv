<script>
	import { superForm } from "sveltekit-superforms";

	let { data } = $props();

	// Client API:
	const { form, enhance, delayed, submitting, timeout, errors } = superForm(data.form);
</script>

<div class="mx-4 mt-4 mb-12 space-y-4 w-full flex flex-col">
	<h2 class="text-xl font-bold">Create Newspaper</h2>

	<form class="w-full flex flex-col gap-2" method="POST" use:enhance>
		<select class="w-full max-w-sm select select-bordered">
			<option value="dark">Category or language??</option>
			<option value="light">Light</option>
			<option value="cupcake">Pink</option>
			<option value="retro">Retro</option>
		</select>

		<label class="form-control w-full">
			<div class="label">
				<span class="label-text">Newspaper name</span>
			</div>
			<input
				class="input input-bordered w-full"
				type="text"
				name="name"
				placeholder="Newspaper name"
				required
				bind:value={$form.name}
				aria-invalid={$errors.name ? "true" : undefined}
			/>
			{#if $errors.name}
				<div class="label">
					<span class="label-text-alt text-error">{$errors.name[0]}</span>
				</div>
			{/if}
		</label>

		<label class="form-control w-full">
			<div class="label">
				<span class="label-text">Newspaper avatar url</span>
			</div>
			<input
				class="input input-bordered w-full"
				type="url"
				name="avatar"
				placeholder="Newspaper avatar url"
				required
				bind:value={$form.avatar}
				aria-invalid={$errors.avatar ? "true" : undefined}
			/>

			{#if $errors.avatar}
				<div class="label">
					<span class="label-text-alt text-error">{$errors.avatar[0]}</span>
				</div>
			{/if}
		</label>

		<label class="form-control w-full">
			<div class="label">
				<span class="label-text">Newspaper background url</span>
			</div>
			<input
				class="input input-bordered w-full"
				type="url"
				name="background"
				placeholder="Newspaper background url"
				bind:value={$form.background}
				aria-invalid={$errors.background ? "true" : undefined}
			/>

			{#if $errors.background}
				<div class="label">
					<span class="label-text-alt text-error">{$errors.background[0]}</span>
				</div>
			{/if}
		</label>

		<button class="btn btn-primary w-full">
			{#if $submitting}<img src="https://w5.giffitsstatic.com/pics/c504/342435_1.jpg" alt="" />{/if} Create newspaper
		</button>
	</form>
</div>
