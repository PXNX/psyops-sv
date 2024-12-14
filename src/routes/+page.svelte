<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowExit20Filled from "~icons/fluent/arrow-exit-20-filled";
	import type { PageData } from "./$types";

	const { data } = $props();
</script>

<h1>Hi, {((console.log("page data"), console.log(data)), data.user.name)}! ROOT PAGE</h1>

<form method="post" use:enhance>
	<button class="btn"><FluentArrowExit20Filled />Sign out FORM</button>
</form>

<a href="/map">Map</a>

<a href="/user">User</a>

<a href="/posts">posts</a>
