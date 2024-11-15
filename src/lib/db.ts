import postgres from "postgres";

const sql = postgres({
	database: process.env.DATABASE_URL,
	ssl: process.env.DB_SSL === "require"
});

export default sql;
