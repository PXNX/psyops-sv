import { db } from "./db";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

import type { RequestEvent } from "@sveltejs/kit";
import type { User } from "./user";

export type Session = {
	id: string;
	userId: string;
	expiresAt: Date;
};

type useression = {
	sessions: Session;
	user: User;
};

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const row = (
		await db.query<useression[]>(
			`SELECT sessions.id , sessions.user_id, sessions.expires_at, user.id , user.email, user.name, user.picture FROM sessions

WHERE sessions.id = $sessionId fetch user`
		)
	)[0];

	console.log("ROW----");
	console.dir(row);

	if (!row) {
		return { session: null, user: null };
	}
	const session: Session = {
		...row.sessions,
		expiresAt: new Date(Date.now() * 1000) //todo get actual date from ROW
	};
	const user: User = {
		...row.user
	};
	if (Date.now() >= session.expiresAt.getTime()) {
		invalidateSession(sessionId);
		return { session: null, user: null };
	}
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await db.query(`UPDATE sessions SET expires_at = $1 WHERE sessions.id = $2`, {
			$1: Math.floor(session.expiresAt.getTime() / 1000),
			$2: session.id
		});
	}
	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.query(`DELETE FROM sessions WHERE id = $sessionId`);
}

export async function invalidateuseressions(userId: number): Promise<void> {
	await db.query(`DELETE FROM sessions WHERE user_id = $1`, { $1: userId });
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

export async function createSession(token: string, userId: string): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};
	const expiresAt = Math.floor(session.expiresAt.getTime() / 1000);
	await db.query(
		`INSERT INTO sessions (id, user_id, expires_at)
            VALUES ($session.id, $session.userId, $expiresAt)`,
		{ expiresAt }
	);
	return session;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };
