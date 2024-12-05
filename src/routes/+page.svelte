<script lang="ts">
	import "../app.css";
	import { enhance } from "$app/forms";
	import Icon from "@iconify/svelte";

	import type { PageData } from "./$types";

	export let data: PageData;
</script>

<h1>Hi, {(console.dir(data.user), data.user.id)}! ROOT PAGE</h1>

<form method="post" use:enhance>
	<button class="btn"> <Icon icon="mdi:logout" class="w-5 h-5" />Sign out</button>
</form>

<a href="/map">Map</a>
