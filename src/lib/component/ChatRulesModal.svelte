<!-- src/lib/component/ChatRulesModal.svelte -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";

	interface Props {
		show: boolean;
	}

	let { show = $bindable() }: Props = $props();
</script>

{#if show}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
		<div class="bg-slate-800 rounded-2xl border border-white/5 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="flex items-center gap-3 mb-6">
				<div class="size-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
					<FluentShield20Filled class="size-6 text-blue-400" />
				</div>
				<div>
					<h2 class="text-2xl font-bold text-white">Chat Rules</h2>
					<p class="text-sm text-gray-400">Please read and accept before using the chat</p>
				</div>
			</div>

			<div class="bg-slate-700/30 rounded-xl p-6 mb-6 space-y-4">
				<div class="flex gap-3">
					<span class="text-2xl">1️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-white mb-1">No Insults</h3>
						<p class="text-sm text-gray-300">Do not insult or harass other members.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">2️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-white mb-1">No Spam</h3>
						<p class="text-sm text-gray-300">Do not send more than three consecutive messages or forwarded albums.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">3️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-white mb-1">No Pornographic Content</h3>
						<p class="text-sm text-gray-300">Pornographic or sexually explicit content is strictly prohibited.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">4️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-white mb-1">No Hate Speech or Illegal Symbols</h3>
						<p class="text-sm text-gray-300">
							No incitement to hatred (Volksverhetzung) or illegal symbols are allowed.
						</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">5️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-white mb-1">No Graphic Violence</h3>
						<p class="text-sm text-gray-300">Do not share images of corpses or severely injured persons.</p>
					</div>
				</div>

				<div class="flex gap-3">
					<span class="text-2xl">6️⃣</span>
					<div class="flex-1">
						<h3 class="font-semibold text-white mb-1">No Privacy Violations</h3>
						<p class="text-sm text-gray-300">Do not share private content of other persons without consent.</p>
					</div>
				</div>
			</div>

			<div class="bg-yellow-600/10 rounded-xl border border-yellow-500/20 p-4 mb-6">
				<p class="text-sm text-yellow-200 font-semibold mb-2">⚠️ Warning System</p>
				<p class="text-sm text-gray-300">
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
				<button type="submit" class="btn w-full bg-blue-600 hover:bg-blue-700 border-0 text-white gap-2">
					<FluentCheckmark20Filled class="size-5" />
					I Accept the Chat Rules
				</button>
			</form>

			<p class="text-xs text-gray-500 text-center mt-4">
				By accepting, you agree to follow these rules and understand that violations may result in warnings,
				restrictions, or bans.
			</p>
		</div>
	</div>
{/if}
