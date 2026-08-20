<!-- src/lib/component/BottomSheet.svelte -->
<script lang="ts">
	import IconDismiss from "~icons/fluent/dismiss-24-regular";
	import IconButton from "$lib/component/ui/IconButton.svelte";

	let {
		open = $bindable(false),
		title = "",
		children
	}: {
		open: boolean;
		title?: string;
		children: any;
	} = $props();

	function handleClose() {
		open = false;
	}

	function handleBackdropClick() {
		handleClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") handleClose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="fixed inset-0 z-50" role="dialog" aria-modal="true" onkeydown={handleKeydown}>
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick={handleBackdropClick} role="presentation"></div>

		<div class="absolute inset-x-0 bottom-0 animate-slide-up">
			<div class="bg-slate-900 border-t border-cyan-500/30 rounded-t-2xl max-h-[85vh] flex flex-col">
				<div class="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
					<div class="mx-auto w-10 h-1 rounded-full bg-gray-600 absolute top-2 left-1/2 -translate-x-1/2"></div>
					{#if title}
						<h3 class="text-lg font-bold text-white">{title}</h3>
					{:else}
						<div></div>
					{/if}
					<IconButton icon={IconDismiss} label="Close" variant="subtle" size="sm" onclick={handleClose} />
				</div>

				<div class="px-5 pb-5 overflow-y-auto">
					{@render children()}
				</div>
			</div>
		</div>
	</div>
{/if}
