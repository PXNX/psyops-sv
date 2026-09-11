<!-- src/lib/component/ChatRulesModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import Button from "$lib/component/ui/Button.svelte";

	interface Props {
		show: boolean;
	}

	let { show = $bindable() }: Props = $props();
</script>

{#if show}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
		<div class="panel max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6">
			<div class="flex items-center gap-3 mb-6">
				<div class="size-12 bg-[#315d8d]/18 rounded-xl flex items-center justify-center">
					<FluentShield20Filled class="size-6 text-[#b7d0e6]" />
				</div>
				<div>
					<h2 class="text-2xl font-bold text-[#fff7e8]">Chat Rules</h2>
					<p class="text-sm text-[#a89e8e]">Please read and accept before using the chat</p>
				</div>
			</div>

			<div class="panel-muted rounded-xl p-6 mb-6 space-y-4">
				<div class="flex gap-3">
					<span class="text-2xl">1️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#fff7e8] mb-1">No Insults</h3>
						<p class="text-sm text-[#d9ccb7]">Do not insult or harass other members.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">2️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#fff7e8] mb-1">No Spam</h3>
						<p class="text-sm text-[#d9ccb7]">Do not send more than three consecutive messages or forwarded albums.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">3️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#fff7e8] mb-1">No Pornographic Content</h3>
						<p class="text-sm text-[#d9ccb7]">Pornographic or sexually explicit content is strictly prohibited.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">4️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#fff7e8] mb-1">No Hate Speech or Illegal Symbols</h3>
						<p class="text-sm text-[#d9ccb7]">
							No incitement to hatred (Volksverhetzung) or illegal symbols are allowed.
						</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">5️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#fff7e8] mb-1">No Graphic Violence</h3>
						<p class="text-sm text-[#d9ccb7]">Do not share images of corpses or severely injured persons.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">6️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#fff7e8] mb-1">No Privacy Violations</h3>
						<p class="text-sm text-[#d9ccb7]">Do not share private content of other persons without consent.</p>
					</div>
				</div>
			</div>

			<div class="bg-[#e6a527]/10 rounded-xl border border-[#e6a527]/25 p-4 mb-6">
				<p class="text-sm text-[#f7c56b] font-semibold mb-2">⚠️ Warning System</p>
				<p class="text-sm text-[#d9ccb7]">
					If an admin identifies a rule violation, it will be penalized with a warning depending on severity. After
					three warnings, the next violation will result in a restriction or ban from the chat.
				</p>
			</div>

			<form
				method="POST"
				action="?/acceptRules"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === "success") {
							show = false;
						}
						await update();
					};
				}}
			>
				<Button type="submit" variant="info" block icon={FluentCheckmark20Filled}>I Accept the Chat Rules</Button>
			</form>

			<p class="text-xs text-[#a89e8e] text-center mt-4">
				By accepting, you agree to follow these rules and understand that violations may result in warnings,
				restrictions, or bans.
			</p>
		</div>
	</div>
{/if}
