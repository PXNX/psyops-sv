<!-- src/routes/(authenticated)/(dock)/domains/OptionPills.svelte -->
<!-- A compact radio group rendered as pills: picks an operation, lane or
     satellite type. Submits `value` under `name` like a select. -->
<script lang="ts">
	interface Option {
		value: string;
		label: string;
		title?: string;
	}

	interface Props {
		name: string;
		label: string;
		options: Option[];
		value: string;
	}

	let { name, label, options, value = $bindable() }: Props = $props();
</script>

<fieldset class="min-w-0">
	<legend class="sr-only">{label}</legend>
	<div class="flex flex-wrap gap-1.5">
		{#each options as option (option.value)}
			<label
				class="cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary {value ===
				option.value
					? 'border-primary/60 bg-primary/15 text-fg'
					: 'border-line/15 bg-surface-2 text-fg-muted hover:border-line/35 hover:text-fg'}"
				title={option.title}
			>
				<input type="radio" class="sr-only" {name} value={option.value} bind:group={value} />
				{option.label}
			</label>
		{/each}
	</div>
</fieldset>
