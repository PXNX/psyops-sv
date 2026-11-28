<!-- src/lib/component/FormError.svelte -->
<!-- Inline feedback for action failures. Pages that use plain <form> (without
     enhance) receive `fail()` data through the `form` prop; render it here so a
     rejected click isn't silent. -->
<script lang="ts">
	let { message, class: className = "mb-3" }: { message: string | null | undefined; class?: string } = $props();
</script>

{#if message}
	<p
		class="{className} flex items-start gap-2 rounded-sm border border-error/40 bg-error/12 px-3 py-2 text-sm text-error-fg"
		role="alert"
	>
		<span aria-hidden="true">⚠</span>
		<span>{message}</span>
	</p>
{/if}
