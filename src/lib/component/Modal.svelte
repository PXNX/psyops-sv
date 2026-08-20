<!-- /src/lib/component/Modal.svelte -->
<script lang="ts">
	import IconDismiss from "~icons/fluent/dismiss-24-regular";
	import IconArrowLeft from "~icons/fluent/arrow-left-24-regular";
	import IconButton from "$lib/component/ui/IconButton.svelte";

	let {
		open = $bindable(false),
		title = "",
		onBack = null,
		size = "default",
		children
	}: {
		open: boolean;
		title?: string;
		onBack?: (() => void) | null;
		size?: "default" | "small" | "large";
		children: any;
	} = $props();

	const sizeClasses = {
		small: "max-w-sm",
		default: "max-w-lg",
		large: "max-w-2xl"
	};

	function handleClose() {
		open = false;
	}

	function handleBackdropClick() {
		handleClose();
	}
</script>

{#if open}
	<div class="modal-open modal z-5003">
		<div class="modal-box {sizeClasses[size]} rounded-xl border border-white/5 bg-slate-900">
			<!-- Header with back button (optional) and close button -->
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if onBack}
						<IconButton icon={IconArrowLeft} label="Go back" size="sm" onclick={onBack} />
					{/if}
					{#if title}
						<h3 class="text-xl font-bold text-white">{title}</h3>
					{/if}
				</div>
				<IconButton icon={IconDismiss} label="Close" size="sm" onclick={handleClose} />
			</div>

			<!-- Modal content -->
			<div class="modal-content">
				{@render children()}
			</div>
		</div>
		<div class="modal-backdrop" onclick={handleBackdropClick}></div>
	</div>
{/if}
