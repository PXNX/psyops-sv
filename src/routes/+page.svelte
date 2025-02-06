<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowExit20Filled from "~icons/fluent/arrow-exit-20-filled";

	const { data } = $props();
</script>

<h1>Hi, {(console.log("page data"), console.log(data))}! ROOT PAGE</h1>

<form method="post" use:enhance>
	<button class="btn"><FluentArrowExit20Filled />Sign out FORM</button>
</form>

<a class="btn" href="/map">Map</a>

<a class="btn" href="/user">User</a>

<a class="btn" href="/posts">posts</a>

<a class="btn" href="/welcome">Welcome</a>

<a class="btn" href="/test">Test</a>
