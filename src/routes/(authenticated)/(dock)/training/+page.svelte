<!-- src/routes/(authenticated)/(dock)/training/+page.svelte -->
<script lang="ts">
	import { m } from "$lib/paraglide/messages.js";

	import type { ActionData } from "./$types";

	export let form: ActionData;
</script>

{m.training()}
