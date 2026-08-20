<!-- src/lib/components/ExternalLinkWarning.svelte -->
<script lang="ts">
	import Modal from "$lib/component/Modal.svelte";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentOpen20Filled from "~icons/fluent/open-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import Button from "$lib/component/ui/Button.svelte";

	let {
		open = $bindable(false),
		url = ""
	}: {
		open: boolean;
		url: string;
	} = $props();

	function handleContinue() {
		window.open(url, "_blank", "noopener,noreferrer");
		open = false;
	}

	function handleCancel() {
		open = false;
	}

	// Get domain from URL for display
	function getDomain(url: string): string {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname;
		} catch {
			return url;
		}
	}
</script>

<Modal bind:open title="External Link Warning" size="default">
	<div class="space-y-4">
		<!-- Warning Icon -->
		<div class="flex justify-center">
			<div class="rounded-full bg-warning/20 p-4">
				<FluentWarning20Filled class="size-8 text-warning" />
			</div>
		</div>

		<!-- Warning Message -->
		<div class="space-y-2 text-center">
			<p class="text-gray-300">You are about to leave this site and visit an external link:</p>
			<div class="rounded-lg bg-slate-700/50 p-3">
				<p class="break-all text-sm font-mono text-blue-400">{getDomain(url)}</p>
			</div>
		</div>

		<!-- Safety Notice -->
		<div class="rounded-lg bg-slate-700/30 border border-warning/30 p-4">
			<p class="text-sm text-gray-400">
				<strong class="text-warning">Safety Notice:</strong> This link leads to an external website. We cannot guarantee the
				safety or content of external sites. Please exercise caution when sharing personal information.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-3">
			<Button variant="secondary" grow icon={FluentDismiss20Filled} onclick={handleCancel}>Cancel</Button>
			<Button variant="info" grow icon={FluentOpen20Filled} onclick={handleContinue}>Continue</Button>
		</div>
	</div>
</Modal>
