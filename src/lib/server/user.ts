import { NoNamespaceSpecified, type RecordId } from "surrealdb";
import { db } from "./db";
import { extractId } from "$lib/util";

export async function createUser(googleId: string, email: string, name: string, picture: string): Promise<User> {
	console.error("createUser id -- sql ", googleId, "before ---");

	const row = await db.insert("user", {
		email,
		name,
		picture,
		google_id: googleId
	});
	console.error("createUser id -- sql ", googleId, "QUERY", row);
	if (row === null) {
		// length 0 ????
		throw new Error("Unexpected error");
	}
	return {
		id: extractId(row[0].id),
		googleId,
		email,
		name,
		picture,
		google_id: googleId
	};
}

export async function getUserFromGoogleId(googleId: string): Promise<User | null> {
	const row = await db.query<[User[]]>(
		`SELECT id, google_id, email, name, picture
                         FROM user
                         WHERE google_id = $googleId;`
	);

	console.error("GOOGLE id -- sql ", googleId, "QUERY 1", row);
	if (row === null || row[0].length === 0 || row[0][0] === undefined) {
		return null;
	}

	console.log("GOOGLE id -- sql ", googleId, "QUERY 2", row[0]);

	return row[0][0];
}

export type User = {
	id: string;
	email: string;
	googleId: string;
	name: string;
	picture: string;
	google_id: string;
};
