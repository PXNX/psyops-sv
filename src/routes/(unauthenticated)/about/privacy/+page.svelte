<!-- src/routes/(unauthenticated)/about/privacy/+page.svelte -->
<script lang="ts">
	import FluentPersonShield24Regular from "~icons/fluent/person-shield-24-regular";
	import FluentShield20Filled from "~icons/fluent/shield-20-filled";
	import FluentLock20Filled from "~icons/fluent/lock-20-filled";
	import FluentEye20Filled from "~icons/fluent/eye-20-filled";
	import FluentDelete20Filled from "~icons/fluent/delete-20-filled";
	import FluentGlobe20Filled from "~icons/fluent/globe-20-filled";
	import FluentDocument20Filled from "~icons/fluent/document-20-filled";
	import PageContainer from "#lib/component/PageContainer.svelte";
	import Button from "#lib/component/ui/Button.svelte";
</script>

<PageContainer maxWidth="4xl" class="py-12">
	<div class="space-y-8">
		<!-- Header -->
		<div class="flex flex-col items-center space-y-5">
			<div class="relative">
				<div class="panel size-32 rounded-sm flex items-center justify-center">
					<FluentPersonShield24Regular class="size-16 text-[#f2b01e]" />
				</div>
			</div>
			<div class="text-center space-y-3">
				<h1 class="text-4xl font-bold text-[#f5efd8]">Privacy Policy</h1>
				<p class="text-[#a8a083] max-w-md mx-auto">GDPR-compliant data protection and privacy information</p>
				<div class="inline-flex items-center gap-2 px-4 py-2 panel-muted rounded-sm">
					<span class="text-sm text-[#d3caa9]">Last updated: January 2025</span>
				</div>
			</div>
		</div>

		<!-- GDPR Compliance Notice -->
		<div class="bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm p-4 flex items-start gap-3">
			<FluentGlobe20Filled class="size-5 text-[#5eaef5] shrink-0 mt-0.5" />
			<div class="text-sm">
				<p class="font-semibold text-[#b3dcff]">GDPR Compliance</p>
				<p class="text-[#b3dcff]/80">
					This privacy policy complies with the EU General Data Protection Regulation (GDPR) and other applicable data
					protection laws.
				</p>
			</div>
		</div>

		<!-- Content Cards -->
		<div class="space-y-6">
			<!-- Data Controller -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentDocument20Filled class="size-5 text-[#e3cbfb]" />
						</div>
						Data Controller
					</h2>
					<div class="space-y-2 text-[#d3caa9]">
						<p class="text-sm">
							The data controller responsible for your personal data is PsyOps. For data protection inquiries, please
							contact us at:
						</p>
						<div class="panel-muted rounded-sm p-4 text-sm">
							<p><strong>Email:</strong> privacy@psyops.example</p>
							<p><strong>Address:</strong> [Company Address]</p>
							<p><strong>DPO Contact:</strong> dpo@psyops.example</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Legal Basis for Processing -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentShield20Filled class="size-5 text-[#5eaef5]" />
						</div>
						Legal Basis for Processing
					</h2>
					<div class="space-y-4 text-[#d3caa9]">
						<p class="text-sm">We process your personal data under the following legal bases (GDPR Art. 6):</p>
						<div class="space-y-3">
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-2">Contract Performance (Art. 6(1)(b))</h3>
								<p class="text-sm">
									Processing necessary to provide the game platform services, manage your account, and fulfill our
									contractual obligations to you.
								</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-2">Consent (Art. 6(1)(a))</h3>
								<p class="text-sm">
									Processing based on your explicit consent for optional features like marketing communications or
									location services. You may withdraw consent at any time.
								</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-2">Legitimate Interest (Art. 6(1)(f))</h3>
								<p class="text-sm">
									Processing for platform security, fraud prevention, and service improvement, where our legitimate
									interests do not override your rights and freedoms.
								</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-2">Legal Obligation (Art. 6(1)(c))</h3>
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
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-[#8a4fc0]/15 border border-[#c08cf0]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentEye20Filled class="size-5 text-[#e3cbfb]" />
						</div>
						Personal Data We Collect
					</h2>
					<div class="space-y-4 text-[#d3caa9]">
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">Identity Data</h3>
							<p class="text-sm">Email address, username, profile picture (optional)</p>
							<p class="text-xs text-[#a8a083]">
								Legal basis: Contract performance, Consent (for optional profile information)
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">Technical Data</h3>
							<p class="text-sm">
								IP address, browser type, device information, cookies, session data, approximate location (derived from
								IP)
							</p>
							<p class="text-xs text-[#a8a083]">Legal basis: Legitimate interest (security and service optimization)</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">Usage Data</h3>
							<p class="text-sm">
								In-game activities, political actions, economic transactions, interaction patterns, preferences
							</p>
							<p class="text-xs text-[#a8a083]">Legal basis: Contract performance, Legitimate interest</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">Communications Data</h3>
							<p class="text-sm">Messages sent within the platform, support tickets, correspondence with us</p>
							<p class="text-xs text-[#a8a083]">Legal basis: Contract performance, Legitimate interest</p>
						</div>
					</div>
				</div>
			</div>

			<!-- How We Use Your Data -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Purposes of Processing</h2>
					<div class="space-y-3 text-[#d3caa9]">
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#c08cf0] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Providing and maintaining the game platform and its features</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#c08cf0] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Managing your account and processing your requests</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#c08cf0] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Personalizing your experience and improving our services</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#c08cf0] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Communicating with you about updates, support, and service-related information</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#c08cf0] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Detecting and preventing fraud, abuse, security breaches, and illegal activities</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#c08cf0] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Analyzing usage patterns to improve game mechanics and user experience</p>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-2 bg-[#c08cf0] rounded-full mt-2 shrink-0"></div>
							<p class="text-sm">Complying with legal obligations and responding to lawful requests from authorities</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Data Retention -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Data Retention</h2>
					<div class="space-y-3 text-[#d3caa9]">
						<p class="text-sm">
							We retain your personal data only for as long as necessary to fulfill the purposes for which it was
							collected, including:
						</p>
						<div class="panel-muted rounded-sm p-4 space-y-2 text-sm">
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
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Data Sharing & Transfers</h2>
					<div class="space-y-4 text-[#d3caa9]">
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">Third-Party Service Providers</h3>
							<p class="text-sm">
								We may share data with trusted service providers who assist in operating our platform (hosting,
								analytics, email services). These providers are contractually bound to protect your data and process it
								only as instructed.
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">Legal Requirements</h3>
							<p class="text-sm">
								We may disclose data when required by law, court order, or to protect our rights, safety, or the rights
								of others.
							</p>
						</div>
						<div class="space-y-2">
							<h3 class="font-semibold text-[#f5efd8]">International Transfers</h3>
							<p class="text-sm">
								If we transfer data outside the EU/EEA, we ensure adequate protection through Standard Contractual
								Clauses (SCCs), adequacy decisions, or other approved mechanisms under GDPR Art. 44-49.
							</p>
						</div>
						<div
							class="bg-[#8a4fc0]/15 border border-[#c08cf0]/30 text-[#e3cbfb] rounded-sm p-4 flex items-start gap-3"
						>
							<FluentShield20Filled class="size-5 text-[#e3cbfb] shrink-0 mt-0.5" />
							<span class="text-sm"> We never sell your personal data to third parties for marketing purposes. </span>
						</div>
					</div>
				</div>
			</div>

			<!-- Your GDPR Rights -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-[#3f8a2a]/18 border border-[#6fd14a]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentDelete20Filled class="size-5 text-[#b9f29a]" />
						</div>
						Your Rights Under GDPR
					</h2>
					<div class="space-y-4 text-[#d3caa9]">
						<p class="text-sm">You have the following rights regarding your personal data:</p>
						<div class="space-y-3">
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right of Access (Art. 15)</h3>
								<p class="text-sm">Request confirmation of what personal data we process and obtain a copy</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right to Rectification (Art. 16)</h3>
								<p class="text-sm">Request correction of inaccurate or incomplete personal data</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right to Erasure / "Right to be Forgotten" (Art. 17)</h3>
								<p class="text-sm">Request deletion of your personal data (subject to legal retention requirements)</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right to Restriction of Processing (Art. 18)</h3>
								<p class="text-sm">Request limitation of processing in certain circumstances</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right to Data Portability (Art. 20)</h3>
								<p class="text-sm">
									Receive your personal data in a structured, commonly used format and transmit it to another controller
								</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right to Object (Art. 21)</h3>
								<p class="text-sm">
									Object to processing based on legitimate interests or for direct marketing purposes
								</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right to Withdraw Consent (Art. 7(3))</h3>
								<p class="text-sm">Withdraw consent at any time where processing is based on consent</p>
							</div>
							<div class="panel-muted rounded-sm p-4">
								<h3 class="font-semibold text-[#f5efd8] mb-1">Right to Lodge a Complaint (Art. 77)</h3>
								<p class="text-sm">Lodge a complaint with your national data protection authority</p>
							</div>
						</div>
						<div
							class="bg-[#3f8a2a]/18 border border-[#6fd14a]/30 text-[#b9f29a] rounded-sm p-4 flex items-start gap-3"
						>
							<span class="text-sm">
								To exercise any of these rights, contact us at privacy@psyops.example. We will respond within 30 days as
								required by GDPR.
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Data Security -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl gap-3">
						<div
							class="size-10 bg-[#2369b5]/18 border border-[#5eaef5]/30 rounded-sm flex items-center justify-center shrink-0"
						>
							<FluentLock20Filled class="size-5 text-[#5eaef5]" />
						</div>
						Data Security & Protection
					</h2>
					<div class="space-y-4 text-[#d3caa9]">
						<p class="text-sm">
							We implement appropriate technical and organizational measures to protect your personal data against
							unauthorized access, alteration, disclosure, or destruction, including:
						</p>
						<div class="space-y-2 text-sm">
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#5eaef5] rounded-full mt-2 shrink-0"></div>
								<p>Encryption of data in transit (TLS/SSL) and at rest</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#5eaef5] rounded-full mt-2 shrink-0"></div>
								<p>Regular security audits and vulnerability assessments</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#5eaef5] rounded-full mt-2 shrink-0"></div>
								<p>Access controls and authentication mechanisms</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#5eaef5] rounded-full mt-2 shrink-0"></div>
								<p>Employee training on data protection and confidentiality</p>
							</div>
							<div class="flex items-start gap-3">
								<div class="size-2 bg-[#5eaef5] rounded-full mt-2 shrink-0"></div>
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
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Cookies & Tracking Technologies</h2>
					<div class="space-y-4 text-[#d3caa9]">
						<p class="text-sm">
							We use cookies and similar technologies in accordance with the ePrivacy Directive. We obtain your consent
							before using non-essential cookies.
						</p>
						<div class="space-y-3">
							<div>
								<h3 class="font-semibold text-[#f5efd8] text-sm">Essential Cookies</h3>
								<p class="text-sm">
									Required for platform functionality (session management, security). No consent needed.
								</p>
							</div>
							<div>
								<h3 class="font-semibold text-[#f5efd8] text-sm">Analytics Cookies</h3>
								<p class="text-sm">Help us understand usage patterns. Requires consent.</p>
							</div>
							<div>
								<h3 class="font-semibold text-[#f5efd8] text-sm">Preference Cookies</h3>
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
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Children's Privacy</h2>
					<p class="text-sm text-[#d3caa9]">
						Our platform is not intended for children under 16 years of age (or the applicable age of consent in your
						jurisdiction). We do not knowingly collect personal data from children. If you believe we have collected
						data from a child, please contact us immediately for deletion.
					</p>
				</div>
			</div>

			<!-- Automated Decision Making -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Automated Decision-Making & Profiling</h2>
					<p class="text-sm text-[#d3caa9]">
						We do not use automated decision-making processes that produce legal effects or similarly significantly
						affect you. Some game features use algorithms for matchmaking or recommendations, but these do not impact
						your rights. You have the right to human intervention if you believe an automated decision unfairly affects
						you (GDPR Art. 22).
					</p>
				</div>
			</div>

			<!-- Supervisory Authority -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Supervisory Authority</h2>
					<div class="space-y-3 text-[#d3caa9]">
						<p class="text-sm">
							You have the right to lodge a complaint with your national data protection authority if you believe we
							have not complied with data protection laws.
						</p>
						<p class="text-sm">
							Find your local authority: <a
								href="https://edpb.europa.eu/about-edpb/board/members_en"
								class="text-[#ffd35c] hover:text-[#ffcf47] hover:underline"
								target="_blank"
								rel="noopener noreferrer">EDPB Member List</a
							>
						</p>
					</div>
				</div>
			</div>

			<!-- Changes to Policy -->
			<div class="panel rounded-sm">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-2xl">Changes to This Privacy Policy</h2>
					<p class="text-sm text-[#d3caa9]">
						We may update this privacy policy to reflect changes in our practices or legal requirements. We will notify
						you of material changes via email or prominent notice on the platform at least 30 days before they take
						effect. The "Last updated" date at the top indicates when changes were made.
					</p>
				</div>
			</div>

			<!-- Contact -->
			<div class="rounded-sm bg-[#2369b5]/18 border border-[#5eaef5]/30">
				<div class="p-5 md:p-6 flex flex-col gap-3">
					<h2 class="section-title text-xl">Questions or Data Rights Requests?</h2>
					<div class="space-y-2 text-[#d3caa9]">
						<p class="text-sm">
							For privacy inquiries or to exercise your GDPR rights, contact our Data Protection Officer:
						</p>
						<div class="panel-muted rounded-sm p-3 text-sm">
							<p><strong>Email:</strong> privacy@psyops.example</p>
							<p><strong>DPO Email:</strong> dpo@psyops.example</p>
							<p><strong>Response time:</strong> Within 30 days as required by GDPR</p>
						</div>
					</div>
					<div class="flex justify-end pt-2">
						<Button href="/about" variant="primary" size="sm">Contact Support</Button>
					</div>
				</div>
			</div>
		</div>
	</div>
</PageContainer>
