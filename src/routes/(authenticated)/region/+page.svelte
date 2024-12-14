<div class="relative bg-purple-600 rounded-lg w-72 shadow-lg shimmer-outline">
	<!-- Header Image Section -->
	<div class="w-full h-40 pb-2 rounded-lg flex justify-center relative overflow-hidden">
		<div class="absolute -inset-0.5 mt-auto bg-gradient-to-b to-purple-600 from-transparent blur h-4" />

		<img
			src="https://media.cntraveller.com/photos/65291b466ba909a7e4c6ce0d/16:9/w_1280,c_limit/Planet_Earth_III_generic_Best_Places_to_see_wildlife_October23_Credit_BBC_studios.jpg"
			alt="Header Image"
			class="w-full h-full object-cover"
		/>
	</div>

	<!-- Header with title and rating -->
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-white text-xl font-semibold">Nebarians</h2>
		<span class="text-white text-sm">Rating #934</span>
	</div>

	<!-- Stats Section -->
	<div class="grid grid-cols-2 gap-2 mb-4">
		<!-- Stat 1 -->
		<div class="flex items-center justify-between">
			<span class="text-white text-sm">7 / 10</span>
			<div class="w-16 h-2 bg-gray-700 rounded-full">
				<div class="w-7/10 h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
			</div>
		</div>
		<!-- Stat 2 -->
		<div class="flex items-center justify-between">
			<span class="text-white text-sm">9 / 18</span>
			<div class="w-16 h-2 bg-gray-700 rounded-full">
				<div class="w-9/18 h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full"></div>
			</div>
		</div>
	</div>

	<!-- Stat 3 -->
	<div class="flex items-center justify-between mb-4">
		<span class="text-white text-sm">15 / 15</span>
		<div class="w-16 h-2 bg-gray-700 rounded-full">
			<div class="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
		</div>
	</div>

	<!-- Actions Section -->
	<div class="flex justify-between mt-4">
		<button class="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full py-2 px-4">Upgrade</button>
		<button class="bg-gray-800 text-white rounded-full py-2 px-4">Copy Link</button>
	</div>

	<!-- Footer with "My Civilizations" button -->
	<div class="mt-4 text-center">
		<button class="text-white text-sm underline">My Civilizations</button>
	</div>
</div>

<!-- Custom Shimmering Outline CSS -->
<style>
	@keyframes shimmer {
		0% {
			border-color: transparent;
			box-shadow:
				0 0 5px rgba(255, 255, 255, 0.5),
				0 0 10px rgba(255, 255, 255, 0.25);
		}
		50% {
			border-color: rgba(255, 255, 255, 0.5);
			box-shadow:
				0 0 10px rgba(255, 255, 255, 0.75),
				0 0 15px rgba(255, 255, 255, 0.5);
		}
		100% {
			border-color: transparent;
			box-shadow:
				0 0 5px rgba(255, 255, 255, 0.5),
				0 0 10px rgba(255, 255, 255, 0.25);
		}
	}

	.shimmer-outline {
		animation: shimmer 2s infinite;
		border: 2px solid transparent;
	}
</style>
