import { db } from "./db";

export async function createUser(googleId: string, email: string, name: string, picture: string): Promise<User> {
	console.error("createUser id -- sql ", googleId, "before ---");

	const row = await db.insert("user", {
		googleId,
		email,
		name,
		picture
	});
	console.error("createUser id -- sql ", googleId, "QUERY", row);
	if (row === null) {
		// length 0 ????
		throw new Error("Unexpected error");
	}
	return {
		id: row[0].id.toString(),
		googleId,
		email,
		name,
		picture
	};
}

export async function getUserFromGoogleId(googleId: string): Promise<User | null> {
	const row = (
		await db.query<User[]>(
			`SELECT id, google_id, email, name, picture
                         FROM users
                         WHERE google_id = $googleId;`
		)
	)[0];
	if (row === null) {
		return null;
	}

	console.log("GOOGLE id -- sql ", googleId, "QUERY", row);

	return row;
}

export type User = {
	id: string;
	email: string;
	googleId: string;
	name: string;
	picture: string;
};
