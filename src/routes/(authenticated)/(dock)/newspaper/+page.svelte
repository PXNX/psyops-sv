<script lang="ts">
	import FluentEmojiNewButton from "~icons/fluent-emoji/new-button";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import Logo from "$lib/component/Logo.svelte";
	import { buttonClass } from "$lib/component/ui/styles";

	const { data } = $props();
</script>

{#if data.newspapers.length > 0}
	<header class="sticky top-0 z-10 bg-[#0c1929]/95 backdrop-blur-sm border-b border-[#dfceb0]/15">
		<div class="flex items-center gap-2 p-3 max-w-3xl mx-auto">
			<input
				class="field-control w-full max-w-xs rounded-lg px-3 py-2 text-sm"
				placeholder="Search Newspapers..."
				type="text"
			/>

			<a class={buttonClass({ variant: "secondary", shape: "square" })} href="/newspaper/create" role="button">
				<FluentEmojiNewButton />
			</a>
		</div>
	</header>

	<ul class="max-w-3xl mx-auto p-3 space-y-2">
		{#each data.newspapers as newspaper}
			{#if newspaper}
				<a href="/newspaper/{newspaper.id}" oncontextmenu={() => false}>
					<li class="panel-interactive rounded-lg p-3 flex items-center gap-3">
						<Logo src={newspaper.logo} alt={newspaper.name} />
						<div>
							<h3 class="text-lg font-bold tracking-tight text-[#fff7e8]">
								{newspaper.name}
							</h3>
							<span class="text-sm text-[#f7c56b]">{newspaper.rank}</span>
						</div>
					</li>
				</a>
			{/if}
		{/each}
	</ul>
{:else}
	<div class="h-full flex flex-col justify-center items-center">
		<div class="max-w-md flex-col space-y-4 flex justify-center items-center text-center">
			<FluentEmojiRolledUpNewspaper class="size-12" />
			<h3 class="text-2xl font-bold text-[#fff7e8]">You don't work for a newspaper</h3>
			<p class="text-[#a89e8e]">
				Newspapers allow you to share events and your views with the community in a more uniform way. You can also ask
				other users to become a journalist for a newspaper they own.
			</p>
			<a class={buttonClass({ variant: "primary" })} href="/newspaper/create" role="button">Get started</a>
		</div>
	</div>
{/if}
