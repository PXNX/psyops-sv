# Architecture Guide

This document describes the refactored architecture of the application.

## Directory Structure

```
src/lib/
├── config/                    # Centralized configuration
│   ├── index.ts              # Main export point
│   ├── game/                 # Game mechanics configuration
│   │   ├── military.config.ts
│   │   ├── buildings.config.ts
│   │   ├── combat.config.ts
│   │   └── economy.config.ts
│   ├── features/             # Feature-specific configs
│   │   ├── party.config.ts
│   │   └── cooldowns.config.ts
│   └── validation/           # Validation rules
│       ├── limits.config.ts
│       └── permissions.config.ts
├── utils/                     # Utility functions
│   ├── formatting.ts
│   ├── travel.ts
│   ├── calculations/         # Game calculations
│   │   ├── buildings.ts
│   │   ├── combat.ts
│   │   └── resources.ts
│   └── geography/
│       ├── regions.ts
│       └── borders.ts
├── components/                # Svelte components (renamed from component)
│   ├── ui/                   # Generic UI components
│   ├── forms/                # Form components
│   ├── chat/                 # Chat components
│   └── ...
└── server/
    ├── context.ts            # Dependency injection context
    ├── schema.ts             # Database schema (will be split)
    ├── db.ts                 # Database connection
    └── services/             # Business logic layer
        ├── auth/
        │   └── auth.service.ts
        ├── military/
        │   └── battle.service.ts
        ├── economy/
        │   ├── wallet.service.ts
        │   ├── company.service.ts
        │   ├── factory.service.ts
        │   └── market.service.ts
        ├── politics/
        │   ├── party.service.ts
        │   ├── proposal.service.ts
        │   └── election.service.ts
        ├── geography/
        │   ├── region.service.ts
        │   └── travel.service.ts
        ├── messaging/
        │   ├── chat.service.ts
        │   └── inbox.service.ts
        └── moderation/
            └── moderation.service.ts
```

## Using the New Architecture

### 1. Import Configurations

```typescript
// Before
import { MILITARY_UNIT_TEMPLATES } from '$lib/config/militaryUnits';
import { BUILDING_TEMPLATES } from '$lib/server/buildings';

// After
import { MILITARY_UNIT_TEMPLATES, BUILDING_TEMPLATES, COMBAT_CONFIG } from '$lib/config';
```

### 2. Use Services in Route Handlers

```typescript
// routes/(authenticated)/example/+page.server.ts
import { getContext } from '$lib/server/context';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const ctx = getContext();
	
	// Use services instead of direct DB queries
	const wallet = await ctx.services.wallet.getBalance(locals.account.id);
	const companies = await ctx.services.company.getCompaniesByOwner(locals.account.id);
	
	return {
		wallet,
		companies
	};
};

export const actions = {
	createCompany: async ({ request, locals }) => {
		const ctx = getContext();
		const data = await request.formData();
		
		// Business logic in service
		const company = await ctx.services.company.createCompany({
			name: data.get('name') as string,
			ownerId: locals.account.id
		});
		
		return { success: true, company };
	}
};
```

### 3. Use Utility Functions

```typescript
// Before
function calculateDamage(attack, defense) {
	// calculation logic here
}

// After
import { calculateDamage, calculateOrganizationLoss } from '$lib/utils';

const damage = calculateDamage(baseAttack, targetDefense, planningBonus, fortLevel);
const orgLoss = calculateOrganizationLoss(damage, currentOrg);
```

### 4. Access Config Values

```typescript
import { ECONOMY_CONFIG, COOLDOWNS_CONFIG, LIMITS_CONFIG } from '$lib/config';

// Use typed constants
const initialBalance = ECONOMY_CONFIG.INITIAL_USER_WALLET;
const maxNameLength = LIMITS_CONFIG.COMPANY_NAME_MAX;
const cooldown = COOLDOWNS_CONFIG.PARTY_CREATION_DAYS;
```

## Service Layer Pattern

Services encapsulate business logic and data access:

```typescript
// Example: WalletService
export class WalletService {
	constructor(private db: typeof import('../../db').db) {}
	
	async getBalance(userId: string): Promise<number> {
		// DB query logic
	}
	
	async transfer(fromUserId: string, toUserId: string, amount: number) {
		// Transaction logic
	}
}
```

Benefits:
- **Testable**: Mock services for unit tests
- **Reusable**: Call from multiple routes
- **Maintainable**: Change logic in one place
- **Type-safe**: Full TypeScript support

## Dependency Injection

The `context.ts` file provides a centralized way to access services:

```typescript
// Get context anywhere
import { getContext } from '$lib/server/context';

const ctx = getContext();
ctx.services.auth.validateSessionToken(token);
ctx.services.wallet.getBalance(userId);
ctx.services.battle.processBattleRound(battleId);
```

## Migration Guide

### Migrating Existing Routes

1. **Import context**:
   ```typescript
   import { getContext } from '$lib/server/context';
   ```

2. **Replace direct DB queries with service calls**:
   ```typescript
   // Before
   const wallet = await db.select().from(userWallets).where(eq(userWallets.userId, userId));
   
   // After
   const ctx = getContext();
   const wallet = await ctx.services.wallet.getWallet(userId);
   ```

3. **Move business logic to services**:
   ```typescript
   // Before (in route)
   const newBalance = wallet.balance + amount;
   await db.update(userWallets).set({ balance: newBalance }).where(eq(userWallets.userId, userId));
   
   // After (in service)
   await ctx.services.wallet.addFunds(userId, amount);
   ```

## Best Practices

1. **Keep routes thin**: Routes should only handle HTTP concerns
2. **Business logic in services**: All game logic belongs in services
3. **Use configs for constants**: Never hardcode values
4. **Type everything**: Leverage TypeScript
5. **Test services**: Services are easy to unit test
6. **Document complex logic**: Add comments for game mechanics

## TODO

The following improvements are planned:

- [ ] Split schema.ts into domain modules
- [ ] Create barrel exports (index.ts files)
- [ ] Add integration tests for services
- [ ] Create repository layer for complex queries
- [ ] Add caching layer for frequently accessed data
- [ ] Implement event system for cross-domain communication
