import { db } from "$lib/server/db";
import { RecordId } from "surrealdb";

export async function createUser(googleId: string, email: string, name: string, avatar: string): Promise<User> {
	console.error("createUser id -- sql ", googleId, "before ---");
	const row = await db.insert("user", {
		email,
		name,
		avatar,
		googleId
	});
	console.error("createUser id -- sql ", googleId, "QUERY", row);
	if (row === null) {
		// length 0 ????
		throw new Error("Unexpected error");
	}
	return {
		id: new RecordId("user", row[0].id.id),
		googleId,
		email,
		name,
		avatar
	};
}

export async function getUserFromGoogleId(googleId: string): Promise<User> {
	const [user] = await db.query<[User[]]>("SELECT * FROM user WHERE googleId=$googleId;");

	console.log("GOOGLE id:", googleId, "user:", user);

	return user[0];
}

export type User = {
	id: RecordId<"user">;
	email: string;
	googleId: string;
	name: string;
	avatar: string;
};
