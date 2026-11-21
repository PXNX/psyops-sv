// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
	schema: ["./src/lib/server/schema.ts", "./src/lib/server/schema-investments.ts"],
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "postgresql://localhost:5432/rw"
	}
});
