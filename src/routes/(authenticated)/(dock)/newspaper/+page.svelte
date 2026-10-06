<script lang="ts">
	import FluentEmojiNewButton from "~icons/fluent-emoji/new-button";
	import FluentEmojiRolledUpNewspaper from "~icons/fluent-emoji/rolled-up-newspaper";
	import Logo from "#lib/component/Logo.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import PageHeader from "#lib/component/PageHeader.svelte";
	import Button from "#lib/component/ui/Button.svelte";
	import IconButton from "#lib/component/ui/IconButton.svelte";

	const { data } = $props();
</script>

{#if data.newspapers.length > 0}
	<PageContainer maxWidth="4xl">
		<PageHeader title="Newspapers">
			{#snippet actions()}
				<IconButton
					href="/newspaper/create"
					icon={FluentEmojiNewButton}
					label="Create newspaper"
					variant="secondary"
					shape="square"
				/>
			{/snippet}
		</PageHeader>

		<input
			class="field-control w-full sm:max-w-xs rounded-sm px-3 py-2.5 text-sm"
			placeholder="Search Newspapers..."
			type="text"
		/>

		<ul class="space-y-2">
			{#each data.newspapers as newspaper}
				{#if newspaper}
					<li>
						<a
							href="/newspaper/{newspaper.id}"
							oncontextmenu={() => false}
							class="group panel-interactive rounded-sm p-4 flex items-center gap-3"
						>
							<Logo src={newspaper.logo} alt={newspaper.name} />
							<div class="min-w-0">
								<h3 class="text-lg font-bold text-[#f5efd8] group-hover:text-[#ffcf47] transition-colors truncate">
									{newspaper.name}
								</h3>
								<span class="text-xs text-[#ffd35c]">{newspaper.rank}</span>
							</div>
						</a>
					</li>
				{/if}
			{/each}
		</ul>
	</PageContainer>
{:else}
	<PageContainer maxWidth="4xl">
		<div class="panel-muted rounded-sm p-12 text-center">
			<div class="max-w-md mx-auto flex flex-col items-center space-y-4">
				<FluentEmojiRolledUpNewspaper class="size-12" />
				<h3 class="text-xl font-bold text-[#f5efd8]">You don't work for a newspaper</h3>
				<p class="text-[#a8a083]">
					Newspapers allow you to share events and your views with the community in a more uniform way. You can also ask
					other users to become a journalist for a newspaper they own.
				</p>
				<Button variant="primary" href="/newspaper/create">Get started</Button>
			</div>
		</div>
	</PageContainer>
{/if}
