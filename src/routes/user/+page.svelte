<script lang="ts">
	import { enhance } from "$app/forms";
	import Icon from "@iconify/svelte";

	import type { PageData } from "./$types";

	export let data: PageData;
</script>

<h1>Hi, {data.user.name}!</h1>
<img src={data.user.picture} height="100px" width="100px" alt="profile" />
<p>Email: {data.user.email}</p>

<a href="/settings" class="btn btn-circle"> <Icon icon="fluent-emoji:gear" class="h-5 w-5" /></a>
