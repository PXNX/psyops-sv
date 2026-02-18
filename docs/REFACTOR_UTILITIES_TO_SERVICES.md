# Refactor: Utilities Consolidated into Services

This document describes the consolidation of separate utility files into their corresponding services.

## Overview

Previously, utility functions were scattered across separate files (`calculations/`, `logo-utils.ts`, `travel.ts`, `regionBorders.ts`). This refactor moves all utility functions into their corresponding service classes for better organization and maintainability.

## Changes Made

### 1. Combat Calculations → BattleService
**File:** `src/lib/server/services/military/battle.service.ts`

Moved from `src/lib/utils/calculations/combat.ts`:
- `calculateCombatWidth(terrain)`
- `calculatePlanningBonus(hoursPlanning)`
- `calculateDamage(baseAttack, targetDefense, planningBonus, fortificationLevel)`
- `calculateOrganizationLoss(damageDealt, currentOrg)`
- `isUnitExhausted(organization)`
- `isUnitDestroyed(strength)`
- `shouldUnitRetreat(organization)`
- `getUnitTemplate(unitType)`

**Usage:**
```typescript
const battleService = getContext().services.battle;
const damage = battleService.calculateDamage(attack, defense, bonus);
```

### 2. Economy/Resource Calculations → WalletService
**File:** `src/lib/server/services/economy/wallet.service.ts`

Moved from `src/lib/utils/calculations/resources.ts`:
- `calculateTax(amount, taxRate)`
- `calculateMarketTransactionFee(totalPrice)`
- `calculateVisaCost(baseCost, taxRate)`
- `calculateFactoryOutput(productionRate, workerCount, infrastructureBonus)`
- `calculateResourceValue(resource, quantity)`

**Usage:**
```typescript
const walletService = getContext().services.wallet;
const tax = walletService.calculateTax(amount, taxRate);
```

### 3. Building Calculations → BuildingService (NEW)
**File:** `src/lib/server/services/economy/building.service.ts`

Moved from `src/lib/utils/calculations/buildings.ts`:
- `getBuildingTemplate(type)`
- `canAffordBuilding(type, availableResources, quantity)`
- `formatBuildingCosts(type, quantity)`
- `calculateConstructionTime(type, infrastructureBonus)`
- `canAffordBorderMaintenance(availableResources, days)`
- `formatBorderMaintenanceCosts(days)`

Plus building CRUD operations:
- `getBuildingById(buildingId)`
- `getBuildingsByRegion(regionId)`
- `createBuilding(data)`
- `updateBuilding(buildingId, data)`
- `deleteBuilding(buildingId)`

**Usage:**
```typescript
const buildingService = getContext().services.building;
const { canAfford, missing } = buildingService.canAffordBuilding(type, resources);
```

### 4. File/Logo Management → FileService (NEW)
**File:** `src/lib/server/services/file.service.ts`

Moved from `src/lib/server/logo-utils.ts`:
- `uploadLogo(logoFile, uploadedBy)`
- `deleteOldLogo(oldLogoId)`
- `deleteOldLogoInTransaction(tx, oldLogoId)`
- `uploadLogoInTransaction(tx, logoFile, uploadedBy)`
- `replaceLogoInTransaction(tx, logoFile, uploadedBy, oldLogoId)`
- `includeLogoUpdate(logoFileId)`
- `processLogoUpdate(logoFile, uploadedBy)`
- `processLogoUpdateInTransaction(tx, logoFile, uploadedBy)`

Plus basic file operations:
- `getFileById(fileId)`
- `createFile(data)`
- `deleteFileById(fileId)`

**Usage:**
```typescript
const fileService = getContext().services.file;
const logoId = await fileService.replaceLogoInTransaction(tx, logo, userId, oldLogoId);
```

**Updated imports in:**
- `src/routes/(authenticated)/(dock)/settings/+page.server.ts`
- `src/routes/(authenticated)/(dock)/party/[id]/edit/+page.server.ts`

### 5. Region Border Operations → RegionService
**File:** `src/lib/server/services/geography/region.service.ts`

Moved from `src/lib/utils/regionBorders.ts`:
- `getBorderingRegions(regionId)`
- `areRegionsAdjacent(regionId1, regionId2)`
- `getBorderDistance(regionId1, regionId2)`
- `getStateBorderingRegions(stateId, targetRegionId)`
- `calculateDirectDistance(lat1, lon1, lat2, lon2)`
- `getDistanceBetweenRegions(regionId1, regionId2)`
- `calculateTravelCost(distanceKm)`
- `calculateTravelTime(distanceKm)`

**Usage:**
```typescript
const regionService = getContext().services.region;
const borders = await regionService.getBorderingRegions(regionId);
const distance = await regionService.getDistanceBetweenRegions(region1, region2);
```

**Updated imports in:**
- `src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts`

### 6. Travel Calculations → TravelService
**File:** `src/lib/server/services/geography/travel.service.ts`

Moved from `src/lib/utils/travel.ts` (server-side):
- `getRegionCenter(regionId)`
- `calculateDistance(from, to)`
- `calculateTravelDuration(distanceKm)`

**Note:** Client-side utilities kept separate for Svelte components.

### 7. Client-Side Travel Utilities (NEW)
**File:** `src/lib/utils/travel-client.ts`

Created for client-side Svelte components:
- `calculateTravelProgress(departureTime, arrivalTime)`
- `formatDuration(minutes)`
- `getTimeRemaining(arrivalTime)`

**Usage in components:**
```typescript
import { calculateTravelProgress, formatDuration, getTimeRemaining } from '$lib/utils/travel-client';
```

**Updated imports in:**
- `src/lib/component/TravelProgress.svelte`

## Context Updates

**File:** `src/lib/server/context.ts`

Added new services to the application context:
```typescript
export interface AppContext {
    db: typeof db;
    services: {
        // ... existing services
        building: BuildingService;  // NEW
        file: FileService;          // NEW
        // ... rest of services
    };
}
```

## Files Deleted

The following utility files have been deleted as their functionality is now in services:
- ❌ `src/lib/utils/calculations/buildings.ts`
- ❌ `src/lib/utils/calculations/combat.ts`
- ❌ `src/lib/utils/calculations/resources.ts`
- ❌ `src/lib/server/logo-utils.ts`
- ❌ `src/lib/utils/travel.ts`
- ❌ `src/lib/utils/regionBorders.ts`

## Migration Guide

### Before (separate utilities):
```typescript
import { calculateDamage } from '$lib/utils/calculations/combat';
import { replaceLogoInTransaction } from '$lib/server/logo-utils';
import { getBorderingRegions } from '$lib/utils/regionBorders';

const damage = calculateDamage(attack, defense);
const logoId = await replaceLogoInTransaction(tx, logo, userId, oldId);
const borders = await getBorderingRegions(regionId);
```

### After (services):
```typescript
import { getContext } from '$lib/server/context';

const context = getContext();

const damage = context.services.battle.calculateDamage(attack, defense);
const logoId = await context.services.file.replaceLogoInTransaction(tx, logo, userId, oldId);
const borders = await context.services.region.getBorderingRegions(regionId);
```

### Client-Side (Svelte components):
```typescript
// For client-side travel utilities only
import { calculateTravelProgress, formatDuration } from '$lib/utils/travel-client';

const progress = calculateTravelProgress(departure, arrival);
```

## Benefits

1. **Better Organization**: Related functionality is grouped together
2. **Easier Discovery**: All region-related functions are in RegionService
3. **Dependency Injection**: Services can be easily mocked for testing
4. **Consistent Patterns**: All services follow the same structure
5. **Clear Separation**: Server-side vs client-side utilities are explicit

## Testing Considerations

When testing, you can now mock individual services:

```typescript
const mockBattleService = {
    calculateDamage: vi.fn().mockReturnValue(100),
    // ... other methods
};

const context = {
    services: {
        battle: mockBattleService,
        // ... other services
    }
};
```

## Notes

- All calculation logic remains unchanged, only the location has moved
- The `getContext()` function provides access to all services globally
- Client-side utilities are kept separate in `travel-client.ts` for browser use
- Services are instantiated once in `context.ts` for efficiency
