import sql from "$lib/db";

export async function createUser(googleId: string, email: string, name: string, picture: string): Promise<User> {
	const row = (
		await sql`INSERT INTO users (google_id, email, name, picture)
                        VALUES (${googleId}, ${email}, ${name}, ${picture})
                        RETURNING user.id`
	)[0];
	if (row === null) {
		throw new Error("Unexpected error");
	}
	return {
		id: row.number(0),
		googleId,
		email,
		name,
		picture
	};
}

export async function getUserFromGoogleId(googleId: string): Promise<User | null> {
	const row = (
		await sql`SELECT id, google_id, email, name, picture
                         FROM users
                         WHERE google_id = ${googleId}`
	)[0];
	if (row === null) {
		return null;
	}
	return {
		id: row.number(0),
		googleId: row.string(1),
		email: row.string(2),
		name: row.string(3),
		picture: row.string(4)
	};
}

export interface User {
	id: number;
	email: string;
	googleId: string;
	name: string;
	picture: string;
}
