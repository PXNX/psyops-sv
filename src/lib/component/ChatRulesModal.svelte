<!-- src/lib/component/ChatRulesModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import Button from "#lib/component/ui/Button.svelte";

	interface Props {
		show: boolean;
	}

	let { show = $bindable() }: Props = $props();
</script>

{#if show}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
		<div class="panel max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-sm p-6">
			<div class="flex items-center gap-3 mb-6">
				<div class="size-12 bg-[#2f6be0]/18 border border-[#6aa8ff]/30 rounded-sm flex items-center justify-center">
					<FluentShield20Filled class="size-6 text-[#c3dbff]" />
				</div>
				<div>
					<h2 class="text-2xl font-bold text-[#eef2ff]">Chat Rules</h2>
					<p class="text-sm text-[#8e9abb]">Please read and accept before using the chat</p>
				</div>
			</div>

			<div class="panel-muted rounded-sm p-6 mb-6 space-y-4">
				<div class="flex gap-3">
					<span class="text-2xl">1️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#eef2ff] mb-1">No Insults</h3>
						<p class="text-sm text-[#c2cbe3]">Do not insult or harass other members.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">2️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#eef2ff] mb-1">No Spam</h3>
						<p class="text-sm text-[#c2cbe3]">Do not send more than three consecutive messages or forwarded albums.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">3️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#eef2ff] mb-1">No Pornographic Content</h3>
						<p class="text-sm text-[#c2cbe3]">Pornographic or sexually explicit content is strictly prohibited.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">4️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#eef2ff] mb-1">No Hate Speech or Illegal Symbols</h3>
						<p class="text-sm text-[#c2cbe3]">
							No incitement to hatred (Volksverhetzung) or illegal symbols are allowed.
						</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">5️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#eef2ff] mb-1">No Graphic Violence</h3>
						<p class="text-sm text-[#c2cbe3]">Do not share images of corpses or severely injured persons.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">6️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-[#eef2ff] mb-1">No Privacy Violations</h3>
						<p class="text-sm text-[#c2cbe3]">Do not share private content of other persons without consent.</p>
					</div>
				</div>
			</div>

			<div class="bg-[#f5a524]/12 rounded-sm border border-[#f5a524]/35 p-4 mb-6">
				<p class="text-sm text-[#ffcb6b] font-semibold mb-2">⚠️ Warning System</p>
				<p class="text-sm text-[#c2cbe3]">
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
				<Button type="submit" variant="primary" block icon={FluentCheckmark20Filled}>I Accept the Chat Rules</Button>
			</form>

			<p class="text-xs text-[#8e9abb] text-center mt-4">
				By accepting, you agree to follow these rules and understand that violations may result in warnings,
				restrictions, or bans.
			</p>
		</div>
	</div>
{/if}
