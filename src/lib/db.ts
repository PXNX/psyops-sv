import postgres from "postgres";

const sql = postgres("postgres://postgres:area@localhost:5432/rw-sv");

//process.env.DATABASE_URL,
//ssl: "prefer" //process.env.DB_SSL === "require"

export default sql;
