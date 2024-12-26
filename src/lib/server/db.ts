import Surreal from "surrealdb";

const MAX_RETRIES = 5;
const RETRY_TIMEOUT = 2000; // 2 seconds
const DB_URL = "http://127.0.0.1:8000/rpc";
let _db: Surreal;

const database = {
	get instance() {
		if (!_db) {
			let retries = 1;

			const tryConnect = async () => {
				try {
					if (retries > 1) {
						console.log(`Database connection retry, attempt number ${retries} of ${MAX_RETRIES}`);
					}
					_db = new Surreal();

					if (!DB_URL) {
						return null;
					}
					await _db.connect(DB_URL, {
						namespace: "dev",
						database: "rw-sv",
						auth: {
							username: "root",
							password: "root"
						}
					});
					console.log("✅ Database connection successful.");
				} catch (error) {
					if (retries < MAX_RETRIES) {
						retries++;
						setTimeout(tryConnect, RETRY_TIMEOUT);
					} else {
						console.log("Database connection failed.");
						throw error;
					}
				}
			};

			tryConnect();
		}
		//	console.log(_db);
		return _db;
	}
};

export const db = database.instance;

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
