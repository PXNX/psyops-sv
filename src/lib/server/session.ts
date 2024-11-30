import { db } from "./db";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

import type { User } from "./user";
import type { RequestEvent } from "@sveltejs/kit";
import sql from "$lib/db";

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const row = (
		await sql`SELECT sessions.id, sessions.user_id, sessions.expires_at, users.id, users.email, users.name, users.picture FROM sessions
INNER JOIN users ON sessions.user_id = users.id
WHERE sessions.id = ${sessionId} limit 1;`
	)[0];

	console.log("ROW----");
	console.dir(row);

	if (row === null) {
		return { session: null, user: null };
	}
	const session: Session = {
		id: row.string(0),
		userId: row.number(1),
		expiresAt: new Date(row.number(2) * 1000)
	};
	const user: User = {
		id: row.number(3),
		googleId: row.string(4),
		email: row.string(5),
		name: row.string(6),
		picture: row.string(7)
	};
	if (Date.now() >= session.expiresAt.getTime()) {
		await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
		return { session: null, user: null };
	}
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await sql`UPDATE sessions SET expires_at = ${Math.floor(session.expiresAt.getTime() / 1000)} WHERE sessions.id = ${session.id}`;
	}
	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function invalidateUserSessions(userId: number): Promise<void> {
	await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set("session", token, {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		expires: expiresAt
	});
}

export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set("session", "", {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		maxAge: 0
	});
}

export function generateSessionToken(): string {
	const tokenBytes = new Uint8Array(20);
	crypto.getRandomValues(tokenBytes);
	return encodeBase32(tokenBytes).toLowerCase();
}

export async function createSession(token: string, userId: number): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};
	await sql`INSERT INTO sessions (id, user_id, expires_at)
            VALUES (${session.id   }, ${session.userId  }, ${Math.floor(session.expiresAt.getTime() / 1000)})`;
	return session;
}

export interface Session {
	id: string;
	expiresAt: Date;
	userId: number;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };
