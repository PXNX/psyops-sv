import Surreal from "surrealdb";

interface DbConfig {
	url: string;
	namespace: string;
	database: string;
	username: string;
	password: string;
}

const DEFAULT_CONFIG: DbConfig = {
	url: "http://127.0.0.1:8000/rpc",
	namespace: "dev",
	database: "rw-sv",
	username: "root",
	password: "root"
};

export async function getDb(config: DbConfig = DEFAULT_CONFIG): Promise<Surreal> {
	const db = new Surreal();

	try {
		await db.connect(config.url, {
			namespace: config.namespace,
			database: config.database,
			auth: {
				password: config.password,
				username: config.username
			}
		});
		//await db.use({ namespace: config.namespace, database: config.database });
		console.log("DB-Connection established.");
		return db;
	} catch (err) {
		console.error("Failed to connect to SurrealDB:", err instanceof Error ? err.message : String(err));
		await db.close();
		throw err;
	}
}

/*
export const observeLive = async <T extends Record<string, unknown>>(thing: string, store: Writable<T[]>) => {
	await db.live(thing, ({ action, result }) => {
		// TODO: on 'CREATE' and 'UPDATE' author (user) object is not fetched, this results in undefined in author.username
		switch (action) {
			case "CREATE":
				return store.update((data) => [result as T, ...data]);
			case "UPDATE":
				return store.update((data) => data.map((record) => (record.id === result.id ? (result as T) : record)));
			case "DELETE":
				return store.update((data) => data.filter((record) => record.id !== result));
			case "CLOSE":
				return;
		}
	});
};
*/

export const NEWSPAPER = "newspaper";
export const JOURNALIST = "journalist";
export const USER = "user";
export const STATE = "state";
export const REGION = "region";
export const ARTICLE = "article";
export const SESSION = "session";
