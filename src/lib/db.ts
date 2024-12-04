import Surreal from "surrealdb";

export const db = new Surreal();

async function initializeDB() {
	try {
		// Connect to the database
		await db.connect("http://127.0.0.1:8000/rpc", {
			database: "rw-sv",
			namespace: "dev"
		});

		// Sign in as a namespace admin
		await db.signin({
			username: "root",
			password: "root"
		});

		// Select a specific namespace and database
		//    await db.use("dev", "rw-sv");

		console.log("Successfully connected to SurrealDB");
	} catch (error) {
		console.error("Error connecting to SurrealDB:", error);
	}
}
