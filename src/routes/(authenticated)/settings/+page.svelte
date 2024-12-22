<script lang="ts">
	import { enhance } from "$app/forms";
	import FluentArrowExit20Filled from "~icons/fluent/arrow-exit-20-filled";
	import FluentEmojiWrappedGift from "~icons/fluent-emoji/wrapped-gift";
	import FluentEmojiPencil from "~icons/fluent-emoji/pencil";
	import FluentEmojiInformation from "~icons/fluent-emoji/information";

	import type { PageData } from "./$types";

	export let data: PageData;
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
		<select class="w-full select select-bordered" data-choose-theme>
			<option value="dark">Default</option>
			<option value="light">Light</option>
			<option value="cupcake">Pink</option>
			<option value="retro">Retro</option>
			<option value="winter">Winter</option>
			<option value="cyberpunk">Cyberpunk</option>
			<option value="cupcake">Pink</option>
			<option value="bumblebee">Bumblebee</option>
			<option value="emerald">Emerald</option>
			<option value="corporate">Corporate</option>
			<option value="synthwave">Synthwave</option>
			<option value="valentine">Valentine</option>
			<option value="halloween">Halloween</option>
			<option value="garden">Garden</option>
			<option value="forest">Forest</option>
			<option value="aqua">Aqua</option>
			<option value="lofi">Lofi</option>
			<option value="pastel">Pastel</option>
			<option value="fantasy">Fantasy</option>
			<option value="wireframe">Wireframe</option>
			<option value="black">Black</option>
			<option value="luxury">Luxury</option>
			<option value="dracula">Dracula</option>
			<option value="cmyk">CMYK</option>
			<option value="autumn">Autumn</option>
			<option value="business">Business</option>
			<option value="acid">Acid</option>
			<option value="lemonade">Lemonade</option>
			<option value="night">Night</option>
			<option value="coffee">Coffee</option>
			<option value="dim">Dim</option>
			<option value="nord">Nord</option>
			<option value="sunset">Sunset</option>
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
