// Mock seed data for PGlite in-memory database
// Mirrors the rest-mock seed data so the SvelteKit app works in mock mode

import {
	accounts,
	userProfiles,
	sessions,
	blocs,
	states,
	regions,
	regionBorders,
	residences,
	userWallets,
	stateTreasury,
	companies,
	companyBudgets,
	factories,
	factoryWorkers,
	marketListings,
	politicalParties,
	partyMembers,
	newspapers,
	journalists,
	articles,
	militaryUnits,
	wars,
	battles,
	battleParticipants,
	battleRounds
} from "./schema";
import type { PgDatabase } from "drizzle-orm/pg-core";

export async function seedMockDatabase(db: PgDatabase<any>) {
	// ============ Blocs ============
	const [bloc1] = await db
		.insert(blocs)
		.values({
			name: "Western Alliance",
			color: "#3b82f6",
			description: "A coalition of western democracies"
		})
		.returning();
	const [bloc2] = await db
		.insert(blocs)
		.values({
			name: "Eastern Pact",
			color: "#ef4444",
			description: "The eastern military pact"
		})
		.returning();

	// ============ States ============
	const [state1] = await db
		.insert(states)
		.values({
			name: "Republic of Freedonia",
			description: "A peaceful democratic republic",
			population: 150,
			rating: 5,
			blocId: bloc1!.id
		})
		.returning();
	const [state2] = await db
		.insert(states)
		.values({
			name: "Empire of Sylvania",
			description: "A powerful industrial empire",
			population: 200,
			rating: 8,
			blocId: bloc2!.id
		})
		.returning();
	const [state3] = await db
		.insert(states)
		.values({
			name: "Kingdom of Borduria",
			description: "A neutral kingdom",
			population: 80,
			rating: 3
		})
		.returning();

	// ============ Regions ============
	const [region1] = await db
		.insert(regions)
		.values({
			latitude: "48.8566",
			longitude: "2.3522",
			stateId: state1!.id,
			rating: 5,
			infrastructure: 3,
			economy: 2,
			education: 2,
			hospitals: 1
		})
		.returning();
	const [region2] = await db
		.insert(regions)
		.values({
			latitude: "52.5200",
			longitude: "13.4050",
			stateId: state1!.id,
			rating: 3,
			infrastructure: 2,
			economy: 1,
			education: 1,
			fortifications: 1
		})
		.returning();
	const [region3] = await db
		.insert(regions)
		.values({
			latitude: "55.7558",
			longitude: "37.6173",
			stateId: state2!.id,
			rating: 7,
			infrastructure: 4,
			economy: 3,
			education: 3,
			hospitals: 2,
			fortifications: 2
		})
		.returning();
	const [region4] = await db
		.insert(regions)
		.values({
			latitude: "50.0755",
			longitude: "14.4378",
			stateId: state2!.id,
			rating: 4,
			infrastructure: 2,
			economy: 2,
			education: 1,
			hospitals: 1,
			fortifications: 3
		})
		.returning();
	const [region5] = await db
		.insert(regions)
		.values({
			latitude: "47.4979",
			longitude: "19.0402",
			stateId: state3!.id,
			rating: 2,
			infrastructure: 1,
			economy: 1,
			education: 1
		})
		.returning();

	// ============ Region Borders ============
	const borders = [
		[region1!.id, region2!.id, "450.00"],
		[region2!.id, region4!.id, "280.00"],
		[region4!.id, region5!.id, "350.00"],
		[region3!.id, region4!.id, "1200.00"]
	] as [number, number, string][];
	for (const [a, b, km] of borders) {
		await db.insert(regionBorders).values({
			regionId: Math.min(a, b),
			neighborId: Math.max(a, b),
			distanceKm: km
		});
	}

	// ============ Accounts ============
	await db.insert(accounts).values([
		{ id: "user-1", email: "alice@example.com", role: "admin" },
		{ id: "user-2", email: "bob@example.com", role: "moderator" },
		{ id: "user-3", email: "charlie@example.com", role: "user" },
		{ id: "user-4", email: "diana@example.com", role: "user", notifyNewspaperPosts: false },
		{ id: "user-5", email: "eve@example.com", role: "user" }
	]);

	// ============ User Profiles ============
	await db.insert(userProfiles).values([
		{ accountId: "user-1", name: "Alice Admin", bio: "Server administrator and Freedonia patriot", theme: "dark" },
		{ accountId: "user-2", name: "Bob Moderator", bio: "Keeping things civil since day one", theme: "cyberpunk" },
		{ accountId: "user-3", name: "Charlie Citizen", bio: "Just a regular citizen trying to make it", theme: "nord" },
		{ accountId: "user-4", name: "Diana Diplomat", bio: "Foreign affairs specialist", theme: "dark" },
		{ accountId: "user-5", name: "Eve Entrepreneur", bio: "Building the economy one factory at a time", theme: "business" }
	]);

	// ============ Sessions ============
	await db.insert(sessions).values([
		{
			id: "mock-session-alice",
			accountId: "user-1",
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
		},
		{
			id: "mock-session-bob",
			accountId: "user-2",
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
		}
	]);

	// ============ Residences ============
	await db.insert(residences).values([
		{ userId: "user-1", regionId: region1!.id },
		{ userId: "user-2", regionId: region1!.id },
		{ userId: "user-3", regionId: region3!.id },
		{ userId: "user-4", regionId: region5!.id },
		{ userId: "user-5", regionId: region3!.id }
	]);

	// ============ Wallets ============
	await db.insert(userWallets).values([
		{ userId: "user-1", balance: 50000 },
		{ userId: "user-2", balance: 25000 },
		{ userId: "user-3", balance: 10000 },
		{ userId: "user-4", balance: 35000 },
		{ userId: "user-5", balance: 100000 }
	]);

	// ============ State Treasury ============
	await db.insert(stateTreasury).values([
		{ stateId: state1!.id, balance: 500000, totalCollected: 750000, totalSpent: 250000 },
		{ stateId: state2!.id, balance: 1200000, totalCollected: 2000000, totalSpent: 800000 },
		{ stateId: state3!.id, balance: 100000, totalCollected: 150000, totalSpent: 50000 }
	]);

	// ============ Companies + Budgets ============
	const [company1] = await db
		.insert(companies)
		.values({
			name: "Freedonia Mining Corp",
			ownerId: "user-1",
			description: "The largest mining operation in Freedonia"
		})
		.returning();
	const [company2] = await db
		.insert(companies)
		.values({
			name: "Eve's Industries",
			ownerId: "user-5",
			description: "Multi-sector industrial conglomerate"
		})
		.returning();

	await db.insert(companyBudgets).values([
		{ companyId: company1!.id, balance: 200000, totalDeposited: 300000, totalSpent: 100000 },
		{ companyId: company2!.id, balance: 500000, totalDeposited: 500000, totalSpent: 0 }
	]);

	// ============ Factories ============
	const [factory1] = await db
		.insert(factories)
		.values({
			name: "Iron Mine Alpha",
			companyId: company1!.id,
			regionId: region1!.id,
			factoryType: "mine",
			resourceOutput: "iron",
			maxWorkers: 10,
			workerWage: 1500,
			productionRate: 10
		})
		.returning();
	const [factory2] = await db
		.insert(factories)
		.values({
			name: "Steel Refinery Beta",
			companyId: company2!.id,
			regionId: region3!.id,
			factoryType: "refinery",
			resourceOutput: "steel",
			maxWorkers: 8,
			workerWage: 2000,
			productionRate: 5
		})
		.returning();
	await db.insert(factories).values({
		name: "Arms Factory Gamma",
		companyId: company2!.id,
		regionId: region3!.id,
		factoryType: "armaments",
		productOutput: "rifles",
		maxWorkers: 12,
		workerWage: 2500,
		productionRate: 3
	});

	// ============ Factory Workers ============
	await db.insert(factoryWorkers).values([
		{ userId: "user-3", factoryId: factory1!.id, jobType: "miner", wageAtShiftStart: 1500 },
		{ userId: "user-5", factoryId: factory2!.id, jobType: "refiner", wageAtShiftStart: 2000 }
	]);

	// ============ Market Listings ============
	await db.insert(marketListings).values([
		{ sellerId: "user-1", itemType: "resource", itemName: "iron", quantity: 50, pricePerUnit: 12 },
		{ sellerId: "user-5", itemType: "resource", itemName: "steel", quantity: 30, pricePerUnit: 55 },
		{ sellerId: "user-5", itemType: "product", itemName: "rifles", quantity: 10, pricePerUnit: 120 }
	]);

	// ============ Political Parties ============
	const [party1] = await db
		.insert(politicalParties)
		.values({
			name: "Freedom Party",
			abbreviation: "FP",
			color: "#3b82f6",
			ideology: "Liberal Democracy",
			description: "For freedom and prosperity",
			founderId: "user-1",
			stateId: state1!.id,
			autoAcceptMembers: true
		})
		.returning();
	const [party2] = await db
		.insert(politicalParties)
		.values({
			name: "Workers United",
			abbreviation: "WU",
			color: "#ef4444",
			ideology: "Social Democracy",
			description: "Workers of the world, unite",
			founderId: "user-3",
			stateId: state2!.id
		})
		.returning();

	await db.insert(partyMembers).values([
		{ userId: "user-1", partyId: party1!.id, role: "leader" },
		{ userId: "user-2", partyId: party1!.id, role: "member", acceptedBy: "user-1" },
		{ userId: "user-3", partyId: party2!.id, role: "leader" },
		{ userId: "user-5", partyId: party2!.id, role: "member", acceptedBy: "user-3" }
	]);

	// ============ Newspapers & Articles ============
	const [newspaper1] = await db
		.insert(newspapers)
		.values({ name: "The Freedonia Times" })
		.returning();
	const [newspaper2] = await db
		.insert(newspapers)
		.values({ name: "Sylvania Daily" })
		.returning();

	await db.insert(journalists).values([
		{ userId: "user-1", newspaperId: newspaper1!.id, rank: "owner" },
		{ userId: "user-5", newspaperId: newspaper2!.id, rank: "owner" }
	]);

	await db.insert(articles).values([
		{
			title: "Welcome to the New Era",
			content: "<p>A new chapter begins for our great nation.</p>",
			authorId: "user-1",
			newspaperId: newspaper1!.id
		},
		{
			title: "Economic Report Q1",
			content: "<p>Steel production is up 15% this quarter.</p>",
			authorId: "user-5",
			newspaperId: newspaper2!.id
		},
		{
			title: "Border Tensions Rise",
			content: "<p>Reports indicate increased military activity.</p>",
			authorId: "user-2",
			newspaperId: newspaper1!.id
		}
	]);

	// ============ Military Units ============
	await db.insert(militaryUnits).values([
		{
			name: "1st Infantry Division",
			ownerId: "user-1",
			stateId: state1!.id,
			regionId: region1!.id,
			unitType: "infantry",
			isTraining: false
		},
		{
			name: "2nd Armor Brigade",
			ownerId: "user-3",
			stateId: state2!.id,
			regionId: region3!.id,
			unitType: "armor",
			organization: 85,
			supplyLevel: 90,
			isTraining: true,
			trainingStartedAt: new Date(),
			trainingCompletesAt: new Date(Date.now() + 3600000)
		},
		{
			name: "3rd Artillery Regiment",
			ownerId: "user-5",
			stateId: state2!.id,
			regionId: region4!.id,
			unitType: "artillery",
			organization: 95,
			supplyLevel: 80,
			isTraining: false
		}
	]);

	// ============ Wars ============
	// War 1: Empire of Sylvania attacks Republic of Freedonia (bloc vs bloc)
	const [war1] = await db
		.insert(wars)
		.values({
			attackerId: state2!.id,
			defenderId: state1!.id,
			attackerBlocId: bloc2!.id,
			defenderBlocId: bloc1!.id,
			declaredBy: "user-3",
			status: "active",
			declaredAt: new Date(Date.now() - 86400000 * 3)
		})
		.returning();

	// War 2: Republic of Freedonia attacks Kingdom of Borduria
	const [war2] = await db
		.insert(wars)
		.values({
			attackerId: state1!.id,
			defenderId: state3!.id,
			attackerBlocId: bloc1!.id,
			declaredBy: "user-1",
			status: "active",
			declaredAt: new Date(Date.now() - 86400000)
		})
		.returning();

	// ============ Battles ============
	// Battle 1: War1, active battle in region2 (Freedonia territory)
	const [battle1] = await db
		.insert(battles)
		.values({
			warId: war1!.id,
			regionId: region2!.id,
			attackerStateId: state2!.id,
			defenderStateId: state1!.id,
			phase: "active",
			terrain: "plains",
			attackerPlanningBonus: 5,
			defenderPlanningBonus: 3,
			status: "ongoing",
			startedBy: "user-3",
			preparationEndsAt: new Date(Date.now() - 3600000 * 6),
			planningStartedAt: new Date(Date.now() - 3600000 * 4),
			startedAt: new Date(Date.now() - 3600000 * 8)
		})
		.returning();

	// Battle 2: War1, preparation battle in region1 (Freedonia territory)
	const [battle2] = await db
		.insert(battles)
		.values({
			warId: war1!.id,
			regionId: region1!.id,
			attackerStateId: state2!.id,
			defenderStateId: state1!.id,
			phase: "preparation",
			terrain: "urban",
			attackerPlanningBonus: 0,
			defenderPlanningBonus: 0,
			status: "ongoing",
			startedBy: "user-5",
			preparationEndsAt: new Date(Date.now() + 3600000 * 2),
			startedAt: new Date(Date.now() - 1800000)
		})
		.returning();

	// Battle 3: War2, planning battle in region5 (Borduria territory)
	const [battle3] = await db
		.insert(battles)
		.values({
			warId: war2!.id,
			regionId: region5!.id,
			attackerStateId: state1!.id,
			defenderStateId: state3!.id,
			phase: "planning",
			terrain: "hills",
			attackerPlanningBonus: 2,
			defenderPlanningBonus: 0,
			status: "ongoing",
			startedBy: "user-1",
			preparationEndsAt: new Date(Date.now() - 3600000),
			planningStartedAt: new Date(Date.now() - 1800000),
			startedAt: new Date(Date.now() - 7200000)
		})
		.returning();

	// ============ Battle Participants ============
	// Need unit IDs — they were auto-generated, so query them
	const allUnits = await db.select().from(militaryUnits);
	const unit1 = allUnits.find((u) => u.name === "1st Infantry Division")!;
	const unit2 = allUnits.find((u) => u.name === "2nd Armor Brigade")!;
	const unit3 = allUnits.find((u) => u.name === "3rd Artillery Regiment")!;

	// Battle 1 participants
	await db.insert(battleParticipants).values([
		{
			battleId: battle1!.id,
			unitId: unit2.id,
			side: "attacker",
			currentStrength: 85,
			currentOrganization: 70,
			maxStrength: 100,
			damageTaken: 15,
			damageDealt: 25,
			isEngaged: true,
			isExhausted: false,
			joinedAt: new Date(Date.now() - 3600000 * 8),
			lastActionAt: new Date(Date.now() - 600000)
		},
		{
			battleId: battle1!.id,
			unitId: unit1.id,
			side: "defender",
			currentStrength: 90,
			currentOrganization: 80,
			maxStrength: 100,
			damageTaken: 10,
			damageDealt: 15,
			isEngaged: true,
			isExhausted: false,
			joinedAt: new Date(Date.now() - 3600000 * 8),
			lastActionAt: new Date(Date.now() - 600000)
		},
		{
			battleId: battle1!.id,
			unitId: unit3.id,
			side: "attacker",
			currentStrength: 95,
			currentOrganization: 75,
			maxStrength: 100,
			damageTaken: 5,
			damageDealt: 20,
			isEngaged: false,
			isExhausted: false,
			joinedAt: new Date(Date.now() - 3600000 * 4)
		}
	]);

	// Battle 3 participant
	await db.insert(battleParticipants).values({
		battleId: battle3!.id,
		unitId: unit1.id,
		side: "attacker",
		currentStrength: 100,
		currentOrganization: 100,
		maxStrength: 100,
		damageTaken: 0,
		damageDealt: 0,
		isEngaged: false,
		isExhausted: false,
		joinedAt: new Date(Date.now() - 7200000)
	});

	// ============ Battle Rounds (for battle1) ============
	await db.insert(battleRounds).values([
		{
			battleId: battle1!.id,
			roundNumber: 1,
			battlePhase: "active",
			attackerUnitsEngaged: 1,
			defenderUnitsEngaged: 1,
			attackerTotalDamage: 15,
			defenderTotalDamage: 10,
			attackerOrgLoss: 10,
			defenderOrgLoss: 15,
			attackerPlanningBonus: 5,
			defenderPlanningBonus: 3,
			roundedAt: new Date(Date.now() - 3600000 * 2)
		},
		{
			battleId: battle1!.id,
			roundNumber: 2,
			battlePhase: "active",
			attackerUnitsEngaged: 2,
			defenderUnitsEngaged: 1,
			attackerTotalDamage: 20,
			defenderTotalDamage: 5,
			attackerOrgLoss: 5,
			defenderOrgLoss: 10,
			attackerPlanningBonus: 5,
			defenderPlanningBonus: 3,
			roundedAt: new Date(Date.now() - 1800000)
		}
	]);

	console.log("🌱 Mock database seeded successfully");
	}
