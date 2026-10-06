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
	import FluentShieldKeyhole20Filled from "~icons/fluent/shield-keyhole-20-filled";
	import Button from "#lib/component/ui/Button.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";

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

<PageContainer maxWidth="4xl">
	<!-- Header -->
	<PageHeader title="Admin Panel" icon={FluentShieldKeyhole20Filled} />

	<div class="flex flex-wrap gap-2">
		<Button href="/admin/broadcast" variant="secondary" icon={FluentMegaphone20Filled}>Broadcast</Button>
		<Button href="/admin/giftcode" variant="secondary" icon={FluentGift20Filled}>Gift Codes</Button>
	</div>

	<div class="border-t border-[#c8b47a]/15"></div>

	<!-- Cron jobs -->
	<div class="flex flex-wrap gap-2">
		<Button href="/api/cron/battles" variant="secondary" icon={FluentBuildingGovernment20Filled}>Battles</Button>
		<Button href="/api/cron/travels" variant="secondary" icon={FluentSend20Filled}>Travels</Button>
		<Button href="/api/cron/proposals" variant="secondary" icon={FluentPeople20Filled}>Proposals</Button>
		<Button href="/api/cron/elections" variant="secondary" icon={FluentWarning20Filled}>Elections</Button>
	</div>
</PageContainer>
