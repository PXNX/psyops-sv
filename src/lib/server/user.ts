import sql from "$lib/db";

export async function createUser(googleId: string, email: string, name: string, picture: string): Promise<User> {
	console.error("createUser id -- sql ", googleId, "before ---");

	const row = await sql`INSERT INTO users (google_id, email, name, picture)
                        VALUES (${googleId}, ${email}, ${name}, ${picture})
                        RETURNING users.id;`;
	console.error("createUser id -- sql ", googleId, "QUERY", row);
	if (row === null) {
		// length 0 ????
		throw new Error("Unexpected error");
	}
	return {
		id: row[0].id,
		googleId,
		email,
		name,
		picture
	};
}

export async function getUserFromGoogleId(googleId: string): Promise<User | null> {
	const row = await sql`SELECT id, google_id, email, name, picture
                         FROM users
                         WHERE google_id = ${googleId}`;
	if (row === null || !row.length) {
		return null;
	}

	console.log("GOOGLE id -- sql ", googleId, "QUERY", row);

	return {
		id: row[0].number(0),
		googleId: row[0].string(1),
		email: row[0].string(2),
		name: row[0].string(3),
		picture: row[0].string(4)
	};
}

export interface User {
	id: number;
	email: string;
	googleId: string;
	name: string;
	picture: string;
}
