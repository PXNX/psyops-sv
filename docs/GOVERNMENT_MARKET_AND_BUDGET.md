# Government Market and Budget System

## Overview

This document describes the Government Market and Budget tracking system that allows state governments to manage resources, trade on the market, and track financial transactions.

## Features

### 1. State Resource Inventory

States can now own and manage resources and products:

- **State Resource Inventory**: Stores resources (iron, copper, steel, gunpowder, wood, coal)
- **State Product Inventory**: Stores products (rifles, ammunition, artillery, vehicles, explosives)

### 2. Government Market Trading

Presidents and Ministers of Economics can trade resources on behalf of the state:

#### Buy Resources

- Purchase resources from the market using state treasury funds
- Adds resources to state inventory
- Records transaction in government budget history

#### Sell Resources

- Sell state-owned resources to the market
- Generates revenue for state treasury
- Removes resources from state inventory
- Records transaction in government budget history

### 3. Government Budget Transaction History

Track all government financial activities:

- Resource purchases and sales
- Construction projects
- Tax collections
- Infrastructure spending
- Military spending
- Other expenditures

## Database Schema

### New Tables

#### `state_resource_inventory`

```sql
- id (PRIMARY KEY)
- state_id (FK → states)
- resource_type (enum: iron, copper, steel, etc.)
- quantity
- updated_at
```

#### `state_product_inventory`

```sql
- id (PRIMARY KEY)
- state_id (FK → states)
- product_type (enum: rifles, ammunition, etc.)
- quantity
- updated_at
```

#### `government_budget_transactions`

```sql
- id (PRIMARY KEY)
- state_id (FK → states)
- transaction_type (enum)
- amount
- balance_after
- description
- authorized_by (FK → accounts)
- item_type
- item_name
- quantity
- price_per_unit
- metadata (JSON)
- created_at
```

### New Enums

#### `government_budget_transaction_type`

- `resource_purchase`
- `resource_sale`
- `construction`
- `tax_collection`
- `infrastructure`
- `military`
- `other`

## API Endpoints

### Government Market

**Route**: `/state/[id]/market`

#### Actions

**`buyResource`**

- **Permission**: President or Minister of Economics
- **Parameters**:
  - `itemType`: "resource" | "product"
  - `itemName`: string
  - `quantity`: number
  - `pricePerUnit`: number
- **Process**:
  1. Validates permissions
  2. Checks treasury balance
  3. Deducts funds from treasury
  4. Adds items to state inventory
  5. Records transaction

**`sellResource`**

- **Permission**: President or Minister of Economics
- **Parameters**:
  - `itemType`: "resource" | "product"
  - `itemName`: string
  - `quantity`: number
  - `pricePerUnit`: number
- **Process**:
  1. Validates permissions
  2. Checks inventory
  3. Removes items from inventory
  4. Adds funds to treasury
  5. Records transaction

### Government Budget History

**Route**: `/state/[id]/budget`

#### Features

- Paginated transaction list (20 per page)
- Analytics dashboard showing:
  - Current treasury balance
  - 30-day income
  - 30-day expenses
  - Net change
  - Category breakdown
- Transaction details including:
  - Transaction type
  - Amount
  - Balance after transaction
  - Authorized by (user)
  - Item details (for resource trades)
  - Timestamp

## User Interface

### Government Market Page

#### Layout

1. **Header**: State name and description
2. **Treasury Overview**: Current balance
3. **Inventory Sidebar**:
   - State Resources with quantities
   - State Products with quantities
4. **Trading Form**:
   - Trade mode toggle (Buy/Sell)
   - Item type selector (Resource/Product)
   - Item selector
   - Quantity input
   - Price per unit input
   - Transaction summary
   - Submit button

#### Features

- Real-time validation
- Market price indicators
- Insufficient funds warnings
- Permission-based access control
- Success/error messaging

### Government Budget Page

#### Layout

1. **Header**: State name and budget title
2. **Analytics Cards**:
   - Treasury Balance
   - Total Income (30 days)
   - Total Expenses (30 days)
   - Net Change (30 days)
3. **Category Breakdown**:
   - Top 5 categories by activity
   - Income vs Expenses visualization
   - Bar charts with values
4. **Transaction History Table**:
   - Transaction type and description
   - Date and time
   - Authorized by (with user link)
   - Amount (colored by income/expense)
   - Balance after
   - Item details (if applicable)
5. **Pagination Controls**

## Permissions

### Who Can Trade

- **President**: Full access to buy and sell resources
- **Minister of Economics**: Full access to buy and sell resources

### Who Can View Budget

- Anyone can view the budget history (transparent government)

## Transaction Recording

All government transactions are recorded with:

- **Transaction Type**: Category of transaction
- **Amount**: Positive for income, negative for expenses
- **Balance After**: Treasury balance after transaction
- **Description**: Human-readable description
- **Authorized By**: User who authorized the transaction
- **Item Details**: Type, name, quantity, and price for resource trades
- **Timestamp**: When the transaction occurred

## Use Cases

### 1. Stockpiling Resources

A state can buy resources during peacetime to prepare for war:

```
1. Minister of Economics navigates to /state/[id]/market
2. Selects "Buy from Market"
3. Chooses "Resource" → "Steel"
4. Enters quantity: 1000
5. Sets price: $1,500 per unit
6. Confirms purchase for $1,500,000
7. Steel is added to state inventory
8. Transaction is recorded in budget history
```

### 2. Generating Revenue

A state can sell excess resources to generate treasury funds:

```
1. President navigates to /state/[id]/market
2. Selects "Sell to Market"
3. Chooses "Resource" → "Iron"
4. Enters quantity: 500
5. Sets price: $1,200 per unit
6. Confirms sale for $600,000
7. Iron is removed from state inventory
8. Funds are added to treasury
9. Transaction is recorded in budget history
```

### 3. Budget Auditing

Citizens can review government spending:

```
1. User navigates to /state/[id]/budget
2. Views analytics dashboard
3. Reviews transaction history
4. Filters by date or category
5. Sees who authorized each transaction
```

## Integration Points

### Existing Systems

#### State Treasury

- Already exists in database
- Tracks balance, total collected, total spent
- Updated by buy/sell transactions

#### Ministers

- Already exists in database
- Ministry type includes "economy"
- Used for permission checks

#### Presidents

- Already exists in database
- Used for permission checks

### Future Enhancements

1. **Construction Projects**
   - Use state resources for building
   - Record in budget history as "construction"

2. **Military Supply**
   - Transfer state resources to military units
   - Record in budget history as "military"

3. **Infrastructure Projects**
   - Use state resources for infrastructure
   - Record in budget history as "infrastructure"

4. **Tax Collection Tracking**
   - Automatically record tax collections
   - Record in budget history as "tax_collection"

## Navigation

Add links to new pages in state navigation:

- State page → "Government Market" tab
- State page → "Budget History" tab

## Error Handling

### Common Errors

1. **Insufficient Permissions**
   - Message: "Only the president or minister of economics can trade resources"
   - Status: 403 Forbidden

2. **Insufficient Funds**
   - Message: "Insufficient treasury funds"
   - Status: 400 Bad Request
   - Details: Required vs Available

3. **Insufficient Stock**
   - Message: "Insufficient resources/products"
   - Status: 400 Bad Request

4. **Invalid Data**
   - Message: "Invalid purchase/sale data"
   - Status: 400 Bad Request

## Testing

### Manual Testing Checklist

#### Buy Resources

- [ ] President can buy resources
- [ ] Minister of Economics can buy resources
- [ ] Other users cannot buy
- [ ] Treasury balance is deducted correctly
- [ ] Resources are added to inventory
- [ ] Transaction is recorded
- [ ] Error on insufficient funds

#### Sell Resources

- [ ] President can sell resources
- [ ] Minister of Economics can sell resources
- [ ] Other users cannot sell
- [ ] Resources are removed from inventory
- [ ] Treasury balance is increased
- [ ] Transaction is recorded
- [ ] Error on insufficient stock

#### Budget History

- [ ] All users can view budget
- [ ] Transactions are displayed correctly
- [ ] Pagination works
- [ ] Analytics are calculated correctly
- [ ] User links work
- [ ] Filtering by date works

## Security Considerations

1. **Permission Checks**: All trading actions verify user is president or minister of economics
2. **Input Validation**: All numeric inputs are validated (min values, positive numbers)
3. **Balance Verification**: Treasury balance is checked before purchases
4. **Inventory Verification**: Inventory is checked before sales
5. **Transaction Atomicity**: All database operations are atomic (treasury update + inventory update + transaction record)

## Performance Considerations

1. **Pagination**: Budget history is paginated (20 per page) to handle large transaction counts
2. **Indexes**: Database indexes on state_id and created_at for fast queries
3. **Caching**: Consider caching treasury balance and inventory totals
4. **Analytics**: 30-day analytics calculated on-demand (could be cached)

## Monitoring

Track the following metrics:

- Number of buy/sell transactions per day
- Average transaction size
- Most traded items
- States with highest trading activity
- Treasury balance changes over time
