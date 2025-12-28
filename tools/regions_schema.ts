-- Updated regions table schema matching your actual schema

export const regions = pgTable("regions", {
	id: integer("id").primaryKey(), // Changed from generatedByDefaultAsIdentity - use HOI4 state ID
	latitude: decimal("latitude"), // Changed from notNull() to optional
	longitude: decimal("longitude"), // Changed from notNull() to optional
	stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
	rating: integer("rating").default(0),
	infrastructure: integer("infrastructure").default(0),
	economy: integer("powerplants").default(0),
	education: integer("education").default(0),
	hospitals: integer("hospitals").default(0),
	fortifications: integer("fortifications").default(0),
	oil: integer("oil").default(0),
	aluminium: integer("aluminium").default(0),
	rubber: integer("rubber").default(0),
	tungsten: integer("tungsten").default(0),
	steel: integer("steel").default(0),
	chromium: integer("chromium").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Note: Make sure to remove .generatedByDefaultAsIdentity() from id
// and remove .notNull() from latitude/longitude to allow null values