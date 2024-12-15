import { db } from "./db";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import type { RequestEvent } from "@sveltejs/kit";
import type { User } from "./user";
import { jsonify, RecordId } from "surrealdb";

export type Session = {
	id: RecordId<string>;
	userId: RecordId<string>;
	expiresAt: Date;
};

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const session = await db.select<Session>(new RecordId("session", sessionId));

	console.log("get Session", sessionId);
	console.dir(jsonify(session));

	const user = await db.select<User>(session.userId);

	console.log("get User", session.userId);
	console.dir(jsonify(user));

	if (!session) {
		return { session: null, user: null };
	}
	const newSession: Session = {
		...session,
		expiresAt: new Date(session.expiresAt.getTime() * 1000) //todo get actual date from ROW
	};

	if (Date.now() >= newSession.expiresAt.getTime()) {
		invalidateSession(new RecordId("session", sessionId));
		return { session: null, user: null };
	}
	if (Date.now() >= newSession.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		newSession.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await db.query(`UPDATE session SET expiresAt = $1 WHERE session.id = $2`, {
			$1: Math.floor(newSession.expiresAt.getTime() / 1000),
			$2: newSession.id
		});
	}

	const dataSession = jsonify(session);
	const dataUser = jsonify(user);

	console.log("before return", dataSession, dataUser);

	console.error("------");

	return { session, user };
}

export async function invalidateSession(sessionId: RecordId<string>): Promise<void> {
	await db.delete(sessionId);
}

export async function invalidateuseressions(userId: RecordId<string>): Promise<void> {
	await db.query(`DELETE FROM session WHERE user_id = $1`, { $1: userId });
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

	console.error("SESSION ID - createSession", sessionId, userId);

	const [session] = await db.create<Session>("session", {
		id: new RecordId("session", sessionId),
		userId: new RecordId("user", userId),
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	});
	console.error("SESSION ID", sessionId, userId, session.expiresAt);
	return session;
}

type SessionValidationResult = { session: Session; user: User } | { session: null; user: null };
