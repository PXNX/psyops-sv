<!-- src/routes/(unauthenticated)/about/privacy/+page.svelte -->
<script lang="ts">
	import FluentPersonShield24Regular from "~icons/fluent/person-shield-24-regular";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentLock20Filled from "~icons/fluent/lock-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
</script>

<div class="relative min-h-screen overflow-hidden">
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
					class="absolute inset-0 bg-[#e6a527]/25 rounded-full blur-2xl opacity-50"
				></div>
				<div
					class="relative size-32 bg-[#14283f] border border-[#dfceb0]/20 rounded-3xl flex items-center justify-center shadow-2xl"
				>
					<FluentPersonShield24Regular class="size-16 text-white" />
				</div>
			</div>
			<div class="text-center space-y-3">
				<h1
					class="text-5xl font-bold tracking-tight text-[#fff7e8]"
				>
					Privacy Policy
				</h1>
				<p class="text-[#a89e8e] max-w-md mx-auto">GDPR-compliant data protection and privacy information</p>
				<div
					class="inline-flex items-center gap-2 px-4 py-2 panel-muted backdrop-blur-sm rounded-full"
				>
					<span class="text-sm text-[#d9ccb7]">Last updated: January 2025</span>
				</div>
			</div>
		</div>

		<!-- GDPR Compliance Notice -->
		<div class="alert bg-[#315d8d]/18 border border-[#7ba0c8]/30">
			<FluentGlobe20Filled class="size-5 text-[#7ba0c8]" />
			<div class="text-sm">
				<p class="font-semibold text-[#b7d0e6]">GDPR Compliance</p>
				<p class="text-[#b7d0e6]/80">
					This privacy policy complies with the EU General Data Protection Regulation (GDPR) and other applicable data
					protection laws.
				</p>
			</div>
		</div>

		<!-- Content Cards -->
		<div class="space-y-6">
			<!-- Data Controller -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-[#8c709b]/20 rounded-xl flex items-center justify-center">
							<FluentDocument20Filled class="size-5 text-[#d5c4df]" />
						</div>
						Data Controller
					</h2>
					<div class="space-y-2 text-[#d9ccb7]">
						<p class="text-sm">
							The data controller responsible for your personal data is PsyOps. For data protection inquiries, please
							contact us at:
						</p>
						<div class="panel-muted rounded-lg p-4 text-sm">
							<p><strong>Email:</strong> privacy@psyops.example</p>
							<p><strong>Address:</strong> [Company Address]</p>
							<p><strong>DPO Contact:</strong> dpo@psyops.example</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Legal Basis for Processing -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-[#315d8d]/20 rounded-xl flex items-center justify-center">
							<FluentShield20Filled class="size-5 text-[#7ba0c8]" />
						</div>
						Legal Basis for Processing
					</h2>
					<div class="space-y-4 text-[#d9ccb7]">
						<p class="text-sm">We process your personal data under the following legal bases (GDPR Art. 6):</p>
						<div class="space-y-3">
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-2">Contract Performance (Art. 6(1)(b))</h3>
								<p class="text-sm">
									Processing necessary to provide the game platform services, manage your account, and fulfill our
									contractual obligations to you.
								</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-2">Consent (Art. 6(1)(a))</h3>
								<p class="text-sm">
									Processing based on your explicit consent for optional features like marketing communications or
									location services. You may withdraw consent at any time.
								</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-2">Legitimate Interest (Art. 6(1)(f))</h3>
								<p class="text-sm">
									Processing for platform security, fraud prevention, and service improvement, where our legitimate
									interests do not override your rights and freedoms.
								</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-2">Legal Obligation (Art. 6(1)(c))</h3>
								<p class="text-sm">
									Processing required to comply with legal obligations, such as responding to lawful requests from
									authorities.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Personal Data We Collect -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-[#8c709b]/20 rounded-xl flex items-center justify-center">
							<FluentEye20Filled class="size-5 text-[#d5c4df]" />
						</div>
						Personal Data We Collect
					</h2>
					<div class="space-y-4 text-[#d9ccb7]">
						<div class="space-y-2">
							<h3 class="font-semibold text-white">Identity Data</h3>
							<p class="text-sm">Email address, username, profile picture (optional)</p>
							<p class="text-xs text-[#a89e8e]">
								Legal basis: Contract performance, Consent (for optional profile information)
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-white">Technical Data</h3>
							<p class="text-sm">
								IP address, browser type, device information, cookies, session data, approximate location (derived from
								IP)
							</p>
							<p class="text-xs text-[#a89e8e]">Legal basis: Legitimate interest (security and service optimization)</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-white">Usage Data</h3>
							<p class="text-sm">
								In-game activities, political actions, economic transactions, interaction patterns, preferences
							</p>
							<p class="text-xs text-[#a89e8e]">Legal basis: Contract performance, Legitimate interest</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-white">Communications Data</h3>
							<p class="text-sm">Messages sent within the platform, support tickets, correspondence with us</p>
							<p class="text-xs text-[#a89e8e]">Legal basis: Contract performance, Legitimate interest</p>
						</div>
					</div>
				</div>
			</div>

			<!-- How We Use Your Data -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Purposes of Processing</h2>
					<div class="space-y-3 text-[#d9ccb7]">
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#b7a0c5] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Providing and maintaining the game platform and its features</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#b7a0c5] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Managing your account and processing your requests</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#b7a0c5] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Personalizing your experience and improving our services</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#b7a0c5] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Communicating with you about updates, support, and service-related information</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#b7a0c5] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Detecting and preventing fraud, abuse, security breaches, and illegal activities</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#b7a0c5] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Analyzing usage patterns to improve game mechanics and user experience</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#b7a0c5] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Complying with legal obligations and responding to lawful requests from authorities</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Data Retention -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Data Retention</h2>
					<div class="space-y-3 text-[#d9ccb7]">
						<p class="text-sm">
							We retain your personal data only for as long as necessary to fulfill the purposes for which it was
							collected, including:
						</p>
						<div class="panel-muted rounded-lg p-4 space-y-2 text-sm">
							<p><strong>Active accounts:</strong> Data retained while your account is active</p>
							<p>
								<strong>Deleted accounts:</strong> Most data deleted within 30 days; some data retained for up to 90 days
								for backup purposes
							</p>
							<p>
								<strong>Legal obligations:</strong> Certain data may be retained longer to comply with legal, tax, or regulatory
								requirements (typically 3-7 years)
							</p>
							<p>
								<strong>Security incidents:</strong> Data related to security breaches or violations may be retained for up
								to 5 years
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Data Sharing -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Data Sharing & Transfers</h2>
					<div class="space-y-4 text-[#d9ccb7]">
						<div class="space-y-2">
							<h3 class="font-semibold text-white">Third-Party Service Providers</h3>
							<p class="text-sm">
								We may share data with trusted service providers who assist in operating our platform (hosting,
								analytics, email services). These providers are contractually bound to protect your data and process it
								only as instructed.
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-white">Legal Requirements</h3>
							<p class="text-sm">
								We may disclose data when required by law, court order, or to protect our rights, safety, or the rights
								of others.
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-white">International Transfers</h3>
							<p class="text-sm">
								If we transfer data outside the EU/EEA, we ensure adequate protection through Standard Contractual
								Clauses (SCCs), adequacy decisions, or other approved mechanisms under GDPR Art. 44-49.
							</p>
						</div>
						<div class="alert bg-[#8c709b]/15 border border-[#b7a0c5]/30">
							<FluentShield20Filled class="size-5 text-[#d5c4df]" />
							<span class="text-sm"> We never sell your personal data to third parties for marketing purposes. </span>
						</div>
					</div>
				</div>
			</div>

			<!-- Your GDPR Rights -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-[#587252]/20 rounded-xl flex items-center justify-center">
							<FluentDelete20Filled class="size-5 text-[#c6dfbf]" />
						</div>
						Your Rights Under GDPR
					</h2>
					<div class="space-y-4 text-[#d9ccb7]">
						<p class="text-sm">You have the following rights regarding your personal data:</p>
						<div class="space-y-3">
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right of Access (Art. 15)</h3>
								<p class="text-sm">Request confirmation of what personal data we process and obtain a copy</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right to Rectification (Art. 16)</h3>
								<p class="text-sm">Request correction of inaccurate or incomplete personal data</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right to Erasure / "Right to be Forgotten" (Art. 17)</h3>
								<p class="text-sm">Request deletion of your personal data (subject to legal retention requirements)</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right to Restriction of Processing (Art. 18)</h3>
								<p class="text-sm">Request limitation of processing in certain circumstances</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right to Data Portability (Art. 20)</h3>
								<p class="text-sm">
									Receive your personal data in a structured, commonly used format and transmit it to another controller
								</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right to Object (Art. 21)</h3>
								<p class="text-sm">
									Object to processing based on legitimate interests or for direct marketing purposes
								</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right to Withdraw Consent (Art. 7(3))</h3>
								<p class="text-sm">Withdraw consent at any time where processing is based on consent</p>
							</div>
							<div class="panel-muted rounded-lg p-4">
								<h3 class="font-semibold text-white mb-1">Right to Lodge a Complaint (Art. 77)</h3>
								<p class="text-sm">Lodge a complaint with your national data protection authority</p>
							</div>
						</div>
						<div class="alert bg-[#587252]/18 border border-[#8fae88]/30">
							<span class="text-sm">
								To exercise any of these rights, contact us at privacy@psyops.example. We will respond within 30 days as
								required by GDPR.
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Data Security -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white flex items-center gap-3">
						<div class="size-10 bg-[#315d8d]/20 rounded-xl flex items-center justify-center">
							<FluentLock20Filled class="size-5 text-[#7ba0c8]" />
						</div>
						Data Security & Protection
					</h2>
					<div class="space-y-4 text-[#d9ccb7]">
						<p class="text-sm">
							We implement appropriate technical and organizational measures to protect your personal data against
							unauthorized access, alteration, disclosure, or destruction, including:
						</p>
						<div class="space-y-2 text-sm">
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#7ba0c8] rounded-full mt-2 shrink-0"></div>
								<p>Encryption of data in transit (TLS/SSL) and at rest</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#7ba0c8] rounded-full mt-2 shrink-0"></div>
								<p>Regular security audits and vulnerability assessments</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#7ba0c8] rounded-full mt-2 shrink-0"></div>
								<p>Access controls and authentication mechanisms</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#7ba0c8] rounded-full mt-2 shrink-0"></div>
								<p>Employee training on data protection and confidentiality</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#7ba0c8] rounded-full mt-2 shrink-0"></div>
								<p>Incident response and breach notification procedures</p>
							</div>
						</div>
						<p class="text-sm">
							In the event of a data breach affecting your rights and freedoms, we will notify you and the relevant
							supervisory authority within 72 hours as required by GDPR Art. 33-34.
						</p>
					</div>
				</div>
			</div>

			<!-- Cookies & Tracking -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Cookies & Tracking Technologies</h2>
					<div class="space-y-4 text-[#d9ccb7]">
						<p class="text-sm">
							We use cookies and similar technologies in accordance with the ePrivacy Directive. We obtain your consent
							before using non-essential cookies.
						</p>
						<div class="space-y-3">
							<div>
								<h3 class="font-semibold text-white text-sm">Essential Cookies</h3>
								<p class="text-sm">
									Required for platform functionality (session management, security). No consent needed.
								</p>
							</div>
							<div>
								<h3 class="font-semibold text-white text-sm">Analytics Cookies</h3>
								<p class="text-sm">Help us understand usage patterns. Requires consent.</p>
							</div>
							<div>
								<h3 class="font-semibold text-white text-sm">Preference Cookies</h3>
								<p class="text-sm">Remember your settings and preferences. Requires consent.</p>
							</div>
						</div>
						<p class="text-sm">
							You can manage cookie preferences in your browser settings or through our cookie consent banner. Visit our
							Cookie Policy for detailed information.
						</p>
					</div>
				</div>
			</div>

			<!-- Children's Privacy -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Children's Privacy</h2>
					<p class="text-sm text-[#d9ccb7]">
						Our platform is not intended for children under 16 years of age (or the applicable age of consent in your
						jurisdiction). We do not knowingly collect personal data from children. If you believe we have collected
						data from a child, please contact us immediately for deletion.
					</p>
				</div>
			</div>

			<!-- Automated Decision Making -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Automated Decision-Making & Profiling</h2>
					<p class="text-sm text-[#d9ccb7]">
						We do not use automated decision-making processes that produce legal effects or similarly significantly
						affect you. Some game features use algorithms for matchmaking or recommendations, but these do not impact
						your rights. You have the right to human intervention if you believe an automated decision unfairly affects
						you (GDPR Art. 22).
					</p>
				</div>
			</div>

			<!-- Supervisory Authority -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Supervisory Authority</h2>
					<div class="space-y-3 text-[#d9ccb7]">
						<p class="text-sm">
							You have the right to lodge a complaint with your national data protection authority if you believe we
							have not complied with data protection laws.
						</p>
						<p class="text-sm">
							Find your local authority: <a
								href="https://edpb.europa.eu/about-edpb/board/members_en"
								class="text-[#7ba0c8] hover:underline"
								target="_blank"
								rel="noopener noreferrer">EDPB Member List</a
							>
						</p>
					</div>
				</div>
			</div>

			<!-- Changes to Policy -->
			<div class="card panel">
				<div class="card-body">
					<h2 class="card-title text-2xl text-white">Changes to This Privacy Policy</h2>
					<p class="text-sm text-[#d9ccb7]">
						We may update this privacy policy to reflect changes in our practices or legal requirements. We will notify
						you of material changes via email or prominent notice on the platform at least 30 days before they take
						effect. The "Last updated" date at the top indicates when changes were made.
					</p>
				</div>
			</div>

			<!-- Contact -->
			<div class="card bg-[#315d8d]/15 border border-[#7ba0c8]/30 shadow-2xl">
				<div class="card-body">
					<h2 class="card-title text-xl text-white">Questions or Data Rights Requests?</h2>
					<div class="space-y-2 text-[#d9ccb7]">
						<p class="text-sm">
							For privacy inquiries or to exercise your GDPR rights, contact our Data Protection Officer:
						</p>
						<div class="panel-muted rounded-lg p-3 text-sm">
							<p><strong>Email:</strong> privacy@psyops.example</p>
							<p><strong>DPO Email:</strong> dpo@psyops.example</p>
							<p><strong>Response time:</strong> Within 30 days as required by GDPR</p>
						</div>
					</div>
					<div class="card-actions justify-end">
						<a href="/about" class="btn btn-primary btn-sm">Contact Support</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
