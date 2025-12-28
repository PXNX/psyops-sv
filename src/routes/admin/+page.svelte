<!-- src/routes/(authenticated)/admin/broadcast/+page.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentMegaphone20Filled from "~icons/fluent/megaphone-20-filled";
	import FluentSend20Filled from "~icons/fluent/send-20-filled";
	import FluentPeople20Filled from "~icons/fluent/people-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentInfo20Filled from "~icons/fluent/info-20-filled";
	import FluentGift20Filled from "~icons/fluent/gift-20-filled";
	import FluentBuildingGovernment20Filled from "~icons/fluent/building-government-20-filled";

	const { data, form } = $props();

	let subject = $state("");
	let content = $state("");
	let isSubmitting = $state(false);
	let showConfirmation = $state(false);

	function resetForm() {
		subject = "";
		content = "";
		showConfirmation = false;
	}
</script>

<div class="max-w-4xl mx-auto px-4 py-6">
	<!-- Header -->
	<div class="flex items-center gap-3 mb-6">
		<div class="size-12 bg-red-600/20 rounded-xl flex items-center justify-center">
			<FluentMegaphone20Filled class="size-6 text-red-400" />
		</div>
		<div>
			<h1 class="text-2xl font-bold text-white">Admin Panel</h1>
		</div>
	</div>

	<a
		href="/admin/broadcast"
		class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
	>
		<FluentMegaphone20Filled class="size-4" />
		Broadcast
	</a>
	<a
		href="/admin/giftcode"
		class="btn bg-slate-700/50 hover:bg-slate-600/50 border-slate-600/30 text-gray-300 hover:text-white gap-2"
	>
		<FluentGift20Filled class="size-4" />
		Gift Codes
	</a>
</div>
