<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowExit20Filled from "~icons/fluent/arrow-exit-20-filled";
	import FluentEmojiWrappedGift from "~icons/fluent-emoji/wrapped-gift";
	import FluentEmojiPencil from "~icons/fluent-emoji/pencil";
	import FluentEmojiInformation from "~icons/fluent-emoji/information";
	import { themes } from "$lib/themes";

	const { data } = $props();

	let current_theme = $state("");

	$effect(() => {
		if (typeof window !== "undefined") {
			const theme = window.localStorage.getItem("theme");
			if (theme && themes.includes(theme)) {
				document.documentElement.setAttribute("data-theme", theme);
				current_theme = theme;
			}
		}
	});

	function set_theme(event: Event) {
		const select = event.target as HTMLSelectElement;
		const theme = select.value;
		if (themes.includes(theme)) {
			const one_year = 60 * 60 * 24 * 365;
			window.localStorage.setItem("theme", theme);
			document.cookie = `theme=${theme}; max-age=${one_year}; path=/; SameSite=Lax`;
			document.documentElement.setAttribute("data-theme", theme);
			current_theme = theme;
		}
	}
</script>

<h1>Hi, {data.account.name}!</h1>
<img src={data.account.avatar} height="100px" width="100px" alt="profile" />
<p>Email: {data.account.email}</p>

<section class="w-full px-4 pt-4 mb-12 space-y-4">
	<h2
		class="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A00] to-[#FF008A] tracking-tighter"
	>
		Application
	</h2>

	<label
		>Theme
		<select
			bind:value={current_theme}
			data-choose-theme
			class="select select-bordered w-full capitalize"
			onchange={set_theme}
		>
			{#each themes as theme}
				<option value={theme} class="capitalize">{theme}</option>
			{/each}
		</select>
	</label>

	<div class="w-full form-control">
		<label class="cursor-pointer label">
			<span class="label-text">Load images</span>
			<input checked class="toggle toggle-primary" type="checkbox" />
		</label>
	</div>

	<label
		>Language
		<select class="w-full select select-bordered">
			<option value="en">English</option>
		</select>
	</label>

	<a class="justify-start w-full btn btn-ghost" href="/about" role="button">
		<FluentEmojiInformation />
		About
	</a>
</section>

<section class="w-full px-4 my-16 space-y-2">
	<h2 class="text-2xl font-bold">Account</h2>

	<button class="justify-start w-full btn btn-primary">
		<!--onclick="my_modal_3.showModal()"-->

		<FluentEmojiPencil />
		Edit profile
	</button>

	<dialog class="modal" id="my_modal_3">
		<div class="modal-box">
			<form method="dialog">
				<button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">✕</button>
			</form>
			<h3 class="text-lg font-bold">Edit profile</h3>

			<form class="w-full max-w-xs space-y-4 form-control">
				<!-- {% include "user/partial/settings_edit.html" %}-->
			</form>
		</div>
	</dialog>

	<script>
		htmx.on("htmx:beforeSwap", (e) => {
			// Empty response targeting #dialog => hide the modal
			if (e.detail.target.id === "my_modal_3" && !e.detail.xhr.response) {
				my_modal_3.hideModal();
				e.detail.shouldSwap = false;
			}
		});
	</script>

	<button class="justify-start w-full btn btn-secondary">
		<!--onclick="my_modal_4.showModal()"-->
		<FluentEmojiWrappedGift />
		Redeem gift
	</button>
	<dialog class="modal" id="my_modal_4">
		<div class="modal-box">
			<form method="dialog">
				<button class="absolute btn btn-sm btn-circle btn-ghost right-2 top-2">✕</button>
			</form>
			<h3 class="text-lg font-bold">Redeem gift</h3>

			<form class="w-full max-w-xs space-y-4 form-control">
				<label
					>Gift Code
					<input
						class="w-full input input-bordered"
						name="user_name"
						placeholder="Some code..."
						required
						type="text"
						value=""
					/>
				</label>

				<button class="btn btn-primary btn-wide"> Try code </button>
			</form>
		</div>
	</dialog>

	<form method="post" use:enhance>
		<button class="btn"><FluentArrowExit20Filled />Sign out FORM</button>
	</form>
</section>
