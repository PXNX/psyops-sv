<script lang="ts">
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FormActions from "$lib/component/ui/FormActions.svelte";

	interface Props {
		cancelHref: string;
		submitting: boolean;
		delayed: boolean;
		disabled: boolean;
		editCost?: number;
		submitLabel?: string;
	}

	let { cancelHref, submitting, delayed, disabled, editCost, submitLabel = "Save Changes" }: Props = $props();

	const submitText = $derived(editCost ? `${submitLabel} (${editCost.toLocaleString()})` : submitLabel);
</script>

<FormActions
	{cancelHref}
	submitLabel={submitText}
	submittingLabel="Saving..."
	submitIcon={FluentCheckmark20Filled}
	submitDisabled={disabled || submitting}
	submitting={delayed}
/>
