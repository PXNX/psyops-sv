import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	// Mock state data

	const account = locals.account!;

	const state = {
		id: params.id,
		name: "Republic of Innovation"
	};

	// Mock party distribution
	const partyDistribution = {
		"Progressive Alliance": 45,
		"Conservative Union": 38,
		"Green Coalition": 22,
		"Liberal Democrats": 18,
		Independent: 7
	};

	const totalSeats = Object.values(partyDistribution).reduce((a, b) => a + b, 0);

	// Mock parliament members
	const mockMembers = [
		{
			name: "Sarah Johnson",
			party: "Progressive Alliance",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
		},
		{
			name: "Michael Chen",
			party: "Progressive Alliance",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael"
		},
		{
			name: "Emma Rodriguez",
			party: "Conservative Union",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma"
		},
		{
			name: "James O'Brien",
			party: "Conservative Union",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james"
		},
		{ name: "Aisha Patel", party: "Green Coalition", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aisha" },
		{ name: "David Kim", party: "Green Coalition", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david" },
		{
			name: "Lisa Anderson",
			party: "Liberal Democrats",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa"
		},
		{
			name: "Robert Martinez",
			party: "Liberal Democrats",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=robert"
		},
		{ name: "Nina Kowalski", party: "Independent", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nina" },
		{
			name: "Thomas Wright",
			party: "Progressive Alliance",
			avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=thomas"
		}
	];

	// Generate more members to match party distribution
	const parliamentMembers = [];
	let userId = 1;

	for (const [party, count] of Object.entries(partyDistribution)) {
		for (let i = 0; i < Math.min(count, 10); i++) {
			// Limit to 10 per party for mock
			const baseMember = mockMembers[Math.floor(Math.random() * mockMembers.length)];
			parliamentMembers.push({
				userId: `user_${userId++}`,
				name: `${baseMember.name} ${i > 0 ? i : ""}`,
				avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${party}${i}`,
				partyAffiliation: party,
				electedAt: new Date(2024, 0, 15).toISOString(),
				term: 1
			});
		}
	}

	// Mock active proposals
	const now = new Date();
	const proposals = [
		{
			id: "proposal_1",
			title: "Universal Healthcare Expansion Act",
			description:
				"A comprehensive bill to expand healthcare coverage to all citizens, including dental and vision care. This proposal aims to reduce out-of-pocket costs by 40% and increase access to preventive care services.",
			proposalType: "healthcare",
			status: "active",
			proposedBy: {
				id: "user_1",
				name: "Sarah Johnson",
				avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
			},
			votingStartsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
			votingEndsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
			requiredMajority: 60,
			voteCounts: {
				for: 67,
				against: 42,
				abstain: 8
			},
			totalVotes: 117,
			percentageFor: 57.26,
			userVote: null
		},
		{
			id: "proposal_2",
			title: "Green Energy Infrastructure Investment",
			description:
				"Allocate $500M for renewable energy infrastructure including solar farms, wind turbines, and electric vehicle charging stations across all regions.",
			proposalType: "infrastructure",
			status: "active",
			proposedBy: {
				id: "user_5",
				name: "Aisha Patel",
				avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aisha"
			},
			votingStartsAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
			votingEndsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
			requiredMajority: 50,
			voteCounts: {
				for: 78,
				against: 31,
				abstain: 12
			},
			totalVotes: 121,
			percentageFor: 64.46,
			userVote: null
		},
		{
			id: "proposal_3",
			title: "Education Technology Modernization Bill",
			description:
				"Fund the installation of high-speed internet and modern computing equipment in all public schools. Includes teacher training programs for digital literacy.",
			proposalType: "education",
			status: "active",
			proposedBy: {
				id: "user_10",
				name: "Thomas Wright",
				avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=thomas"
			},
			votingStartsAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
			votingEndsAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
			requiredMajority: 50,
			voteCounts: {
				for: 89,
				against: 18,
				abstain: 6
			},
			totalVotes: 113,
			percentageFor: 78.76,
			userVote: null
		},
		{
			id: "proposal_4",
			title: "Small Business Tax Relief Package",
			description:
				"Reduce corporate tax rates for businesses with annual revenue under $5M by 15%. Includes streamlined business registration and licensing processes.",
			proposalType: "tax",
			status: "active",
			proposedBy: {
				id: "user_3",
				name: "Emma Rodriguez",
				avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma"
			},
			votingStartsAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
			votingEndsAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
			requiredMajority: 55,
			voteCounts: {
				for: 52,
				against: 58,
				abstain: 15
			},
			totalVotes: 125,
			percentageFor: 41.6,
			userVote: null
		},
		{
			id: "proposal_5",
			title: "Criminal Justice Reform Initiative",
			description:
				"Implement restorative justice programs, reform sentencing guidelines for non-violent offenses, and increase funding for rehabilitation services.",
			proposalType: "justice",
			status: "active",
			proposedBy: {
				id: "user_7",
				name: "Lisa Anderson",
				avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa"
			},
			votingStartsAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
			votingEndsAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
			requiredMajority: 50,
			voteCounts: {
				for: 61,
				against: 47,
				abstain: 9
			},
			totalVotes: 117,
			percentageFor: 52.14,
			userVote: null
		}
	];

	// Check if user is a parliament member (mock - you can adjust this logic)

	const isParliamentMember = !!account.id; // For demo, any logged-in user is a member
	const userParty = isParliamentMember ? "Progressive Alliance" : null;

	// If user is member, add their votes to some proposals
	if (isParliamentMember) {
		proposals[0].userVote = "for";
		proposals[2].userVote = "for";
		proposals[4].userVote = "abstain";
	}

	return {
		state,
		parliamentMembers: parliamentMembers.slice(0, 50), // Return first 50 for display
		partyDistribution,
		totalSeats,
		proposals,
		isParliamentMember,
		userParty
	};
};

export const actions: Actions = {
	vote: async ({ request, locals }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const proposalId = formData.get("proposalId") as string;
		const voteType = formData.get("voteType") as "for" | "against" | "abstain";

		// Mock validation
		if (!proposalId || !voteType) {
			return fail(400, { error: "Invalid vote data" });
		}

		// Simulate successful vote
		console.log(`User ${account.id} voted ${voteType} on proposal ${proposalId}`);

		// In a real app, you'd update the database here
		// For now, just return success
		return { success: true };
	}
};
