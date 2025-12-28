<!-- src/routes/(unauthenticated)/about/terms/+page.svelte -->
<script lang="ts">
	import FluentDocumentText20Filled from "~icons/fluent/document-text-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
</script>

<div class="relative min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-purple-900 overflow-hidden">
	<!-- Background Pattern -->
	<div
		class="absolute inset-0 opacity-10"
		style="background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px);"
	></div>
	<div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80"></div>

	<div class="relative z-10 max-w-4xl mx-auto px-4 py-12 space-y-8">
		<!-- Header -->
		<div class="flex flex-col items-center space-y-6">
			<div class="relative">
				<div
					class="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-50"
				></div>
				<div
					class="relative size-32 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-white/10"
				>
					<FluentDocumentText20Filled class="size-16 text-white" />
				</div>
			</div>
			<div class="text-center space-y-3">
				<h1
					class="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent"
				>
					Terms of Service
				</h1>
				<p class="text-gray-400 max-w-md mx-auto">Rules and guidelines for using our platform</p>
				<div
					class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-full"
				>
					<span class="text-sm text-gray-300">Effective: January 2025</span>
				</div>
			</div>
		</div>

		<!-- Content Cards -->
		<div class="space-y-6">
			<!-- Acceptance of Terms -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
							<FluentCheckmark20Filled class="size-5 text-blue-400" />
						</div>
						Acceptance of Terms
					</h2>
					<p class="text-sm text-gray-300">
						By accessing or using PsyOps, you agree to be bound by these Terms of Service and all applicable laws and
						regulations. If you do not agree with any of these terms, you are prohibited from using this platform.
					</p>
				</div>
			</div>

			<!-- User Accounts -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
							<FluentShield20Filled class="size-5 text-purple-400" />
						</div>
						User Accounts & Responsibilities
					</h2>
					<div class="space-y-3 text-gray-300">
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-green-400 shrink-0 mt-0.5" />
							<p class="text-sm">You must be at least 13 years old to create an account</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-green-400 shrink-0 mt-0.5" />
							<p class="text-sm">You are responsible for maintaining the security of your account credentials</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-green-400 shrink-0 mt-0.5" />
							<p class="text-sm">You must provide accurate and truthful information during registration</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-green-400 shrink-0 mt-0.5" />
							<p class="text-sm">One person may only maintain one account at a time</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-green-400 shrink-0 mt-0.5" />
							<p class="text-sm">
								You are responsible for all activities that occur under your account, including actions taken by others
								with access to your credentials
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Prohibited Conduct -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-red-600/20 rounded-xl flex items-center justify-center">
							<FluentDismiss20Filled class="size-5 text-red-400" />
						</div>
						Prohibited Conduct
					</h2>
					<div class="space-y-3 text-gray-300">
						<p class="text-sm">You agree NOT to engage in any of the following activities:</p>
						<div class="flex items-start gap-3">
							<FluentDismiss20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
							<p class="text-sm">Harassment, hate speech, or threatening behavior toward other users</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentDismiss20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
							<p class="text-sm">Creating multiple accounts or using automated tools (bots)</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentDismiss20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
							<p class="text-sm">Exploiting bugs or game mechanics for unfair advantages</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentDismiss20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
							<p class="text-sm">Sharing explicit, violent, or illegal content</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentDismiss20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
							<p class="text-sm">Attempting to gain unauthorized access to other accounts or systems</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentDismiss20Filled class="size-5 text-red-400 shrink-0 mt-0.5" />
							<p class="text-sm">Trading or selling accounts, in-game currency, or items for real money</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Content & Intellectual Property -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Content & Intellectual Property</h2>
					<div class="space-y-4 text-gray-300">
						<div class="space-y-2">
							<h3 class="font-semibold text-white">User-Generated Content</h3>
							<p class="text-sm">
								You retain ownership of content you create (articles, party descriptions, etc.), but grant us a license
								to display and distribute it within the platform.
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-white">Platform Content</h3>
							<p class="text-sm">
								All platform code, design, mechanics, and original content are owned by PsyOps and protected by
								intellectual property laws.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Virtual Currency & Items -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Virtual Currency & Items</h2>
					<div class="space-y-3 text-gray-300">
						<p class="text-sm">
							All in-game currency, resources, and items are virtual and have no real-world monetary value. They cannot
							be exchanged for real money or transferred outside the platform.
						</p>
						<div class="alert bg-yellow-600/10 border-yellow-500/30">
							<FluentWarning20Filled class="size-5 text-yellow-400" />
							<span class="text-sm">
								We reserve the right to modify, suspend, or terminate virtual items or currency at any time for any
								reason.
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Termination -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Account Termination</h2>
					<p class="text-sm text-gray-300">
						We reserve the right to suspend or terminate your account at any time for violations of these Terms, illegal
						activity, or behavior that harms the platform or other users. You may also delete your account at any time
						through account settings.
					</p>
				</div>
			</div>

			<!-- Disclaimers -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Disclaimers & Limitation of Liability</h2>
					<div class="space-y-3 text-gray-300">
						<p class="text-sm">
							The platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted
							service, bug-free operation, or that the platform will meet your expectations.
						</p>
						<p class="text-sm">
							We are not liable for any indirect, incidental, or consequential damages arising from your use of the
							platform, including loss of data, progress, or virtual items.
						</p>
					</div>
				</div>
			</div>

			<!-- Changes to Terms -->
			<div class="card bg-slate-800/50 backdrop-blur-xl border border-white/10 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Changes to These Terms</h2>
					<p class="text-sm text-gray-300">
						We may update these Terms of Service from time to time. We will notify you of significant changes through
						the platform or via email. Continued use of the platform after changes constitutes acceptance of the updated
						terms.
					</p>
				</div>
			</div>

			<!-- Contact -->
			<div class="card bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-xl text-white">Questions About These Terms?</h2>
					<p class="text-sm text-gray-300">
						If you have any questions about these Terms of Service, please contact our support team.
					</p>
					<div class="card-actions justify-end">
						<a href="/about" class="btn btn-primary btn-sm">Contact Support</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
