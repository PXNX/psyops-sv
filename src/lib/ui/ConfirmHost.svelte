<!-- src/lib/ui/ConfirmHost.svelte — renders confirmAction() questions; mount once in the root layout. -->
<script lang="ts">
	import BottomSheet from "#lib/component/BottomSheet.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import { confirmStore } from "./confirm.svelte";

	const current = $derived(confirmStore.current);
</script>

<BottomSheet
	bind:open={() => current !== null, (open) => !open && confirmStore.answer(false)}
	title={current?.title ?? ""}
>
	{#if current}
		{#if current.body}
			<p class="text-sm text-[#d3caa9]">{current.body}</p>
		{/if}
		<div class="mt-5 flex gap-3">
			<Button variant="secondary" grow onclick={() => confirmStore.answer(false)}>
				{current.cancelLabel ?? "Cancel"}
			</Button>
			<Button variant={current.danger ? "danger" : "primary"} grow onclick={() => confirmStore.answer(true)}>
				{current.confirmLabel ?? "Confirm"}
			</Button>
		</div>
	{/if}
</BottomSheet>
