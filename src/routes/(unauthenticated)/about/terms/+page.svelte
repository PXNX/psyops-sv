<!-- src/routes/(unauthenticated)/about/terms/+page.svelte -->
<script lang="ts">
	import FluentDocumentText20Filled from "~icons/fluent/document-text-20-filled";
	import FluentCheckmark20Filled from "~icons/fluent/checkmark-20-filled";
	import FluentDismiss20Filled from "~icons/fluent/dismiss-20-filled";
	import FluentWarning20Filled from "~icons/fluent/warning-20-filled";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import Button from "#lib/component/ui/Button.svelte";
	import PageContainer from "#lib/component/PageContainer.svelte";
</script>

<PageContainer maxWidth="4xl" class="py-12">
	<div class="space-y-8">
		<!-- Header -->
		<div class="flex flex-col items-center space-y-5">
			<div class="relative">
				<div class="panel size-32 rounded-sm flex items-center justify-center">
					<FluentDocumentText20Filled class="size-16 text-[#f2b01e]" />
				</div>
			</div>
			<div class="text-center space-y-3">
				<h1 class="text-4xl font-bold text-[#f5efd8]">Terms of Service</h1>
				<p class="text-[#a8a083] max-w-md mx-auto">Rules and guidelines for using our platform</p>
				<div class="inline-flex items-center gap-2 px-4 py-2 panel-muted rounded-sm">
					<span class="text-sm text-[#d3caa9]">Effective: January 2025</span>
				</div>
			</div>
		</div>

		<!-- Content Cards -->
		<div class="space-y-6">
			<!-- Acceptance of Terms -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentCheckmark20Filled class="size-5 text-[#5eaef5]" />
						</div>
						Acceptance of Terms
					</h2>
					<p class="text-sm text-[#d3caa9]">
						By accessing or using PsyOps, you agree to be bound by these Terms of Service and all applicable laws and
						regulations. If you do not agree with any of these terms, you are prohibited from using this platform.
					</p>
				</div>
			</div>

			<!-- User Accounts -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentShield20Filled class="size-5 text-[#e3cbfb]" />
						</div>
						User Accounts & Responsibilities
					</h2>
					<div class="space-y-3 text-[#d3caa9]">
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-[#6fd14a] shrink-0 mt-0.5" />
							<p class="text-sm">You must be at least 13 years old to create an account</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-[#6fd14a] shrink-0 mt-0.5" />
							<p class="text-sm">You are responsible for maintaining the security of your account credentials</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-[#6fd14a] shrink-0 mt-0.5" />
							<p class="text-sm">You must provide accurate and truthful information during registration</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-[#6fd14a] shrink-0 mt-0.5" />
							<p class="text-sm">One person may only maintain one account at a time</p>
						</div>
						<div class="flex items-start gap-3">
							<FluentCheckmark20Filled class="size-5 text-[#6fd14a] shrink-0 mt-0.5" />
							<p class="text-sm">
								You are responsible for all activities that occur under your account, including actions taken by others
								with access to your credentials
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Prohibited Conduct -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-red-600/10 border border-red-500/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentDismiss20Filled class="size-5 text-red-400" />
						</div>
						Prohibited Conduct
					</h2>
					<div class="space-y-3 text-[#d3caa9]">
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
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Content & Intellectual Property</h2>
					<div class="space-y-4 text-[#d3caa9]">
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">User-Generated Content</h3>
							<p class="text-sm">
								You retain ownership of content you create (articles, party descriptions, etc.), but grant us a license
								to display and distribute it within the platform.
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">Platform Content</h3>
							<p class="text-sm">
								All platform code, design, mechanics, and original content are owned by PsyOps and protected by
								intellectual property laws.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Virtual Currency & Items -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Virtual Currency & Items</h2>
					<div class="space-y-3 text-[#d3caa9]">
						<p class="text-sm">
							All in-game currency, resources, and items are virtual and have no real-world monetary value. They cannot
							be exchanged for real money or transferred outside the platform.
						</p>
						<div
							class="bg-[#f2b01e]/12 border border-[#f2b01e]/35 text-[#ffd35c] rounded-sm p-4 flex items-start gap-3"
						>
							<FluentWarning20Filled class="size-5 text-[#ffd35c] shrink-0 mt-0.5" />
							<span class="text-sm">
								We reserve the right to modify, suspend, or terminate virtual items or currency at any time for any
								reason.
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Termination -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Account Termination</h2>
					<p class="text-sm text-[#d3caa9]">
						We reserve the right to suspend or terminate your account at any time for violations of these Terms, illegal
						activity, or behavior that harms the platform or other users. You may also delete your account at any time
						through account settings.
					</p>
				</div>
			</div>

			<!-- Disclaimers -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Disclaimers & Limitation of Liability</h2>
					<div class="space-y-3 text-[#d3caa9]">
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
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Changes to These Terms</h2>
					<p class="text-sm text-[#d3caa9]">
						We may update these Terms of Service from time to time. We will notify you of significant changes through
						the platform or via email. Continued use of the platform after changes constitutes acceptance of the updated
						terms.
					</p>
				</div>
			</div>

			<!-- Contact -->
			<div class="rounded-sm bg-[#8a4fc0]/15 border border-[#c08cf0]/30">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-xl">Questions About These Terms?</h2>
					<p class="text-sm text-[#d3caa9]">
						If you have any questions about these Terms of Service, please contact our support team.
					</p>
					<div class="flex justify-end pt-2">
						<Button href="/about" variant="primary" size="sm">Contact Support</Button>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageContainer>
