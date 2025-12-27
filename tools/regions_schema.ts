-- Updated regions table schema matching your current schema

export const regions = pgTable("regions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	rating: integer("rating").default(0),
	infrastructure: integer("infrastructure").default(0),
	economy: integer("powerplants").default(0),

	// New infrastructure fields
	education: integer("education").default(0),
	hospitals: integer("hospitals").default(0),
	fortifications: integer("fortifications").default(0),

	// Resources
	oil: integer("oil").default(0),
	aluminium: integer("aluminium").default(0),
	rubber: integer("rubber").default(0),
	tungsten: integer("tungsten").default(0),
	steel: integer("steel").default(0),
	chromium: integer("chromium").default(0),
	
	// Country this region belongs to
	country: varchar("country", { length: 100 }),
	
	// Optional: state_id if regions belong to states
	stateId: uuid("state_id").references(() => states.id, { onDelete: "cascade" }),

	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Don't forget to add Paraglide messages for region names:
// m.region_1 = "Region Name"
// And coat of arms SVGs at:
// /static/coats/1.svg