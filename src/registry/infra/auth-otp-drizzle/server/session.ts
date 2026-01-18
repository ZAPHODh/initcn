import { cache } from "react";
import { sha256 } from "@oslojs/crypto/sha2";
import {
	encodeBase32LowerCaseNoPadding,
	encodeHexLowerCase,
} from "@oslojs/encoding";
import { db } from "../db";
import { sessions, users } from "../schemas/drizzle.schema";
import { eq } from "drizzle-orm";
import { getSessionTokenCookie } from "@/lib/server/auth/server/cookies";
import type { SessionValidationResult } from "@/lib/server/auth/types";

export const SESSION_EXPIRY_DAYS = 30;
export const SESSION_RENEWAL_THRESHOLD_DAYS = 15;
export const SESSION_COOKIE_NAME = "session";

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export function createSessionId(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export function getSessionExpiry(days: number = SESSION_EXPIRY_DAYS): Date {
	return new Date(Date.now() + 1000 * 60 * 60 * 24 * days);
}

export function isSessionExpiringSoon(
	expiresAt: Date,
	thresholdDays: number = SESSION_RENEWAL_THRESHOLD_DAYS,
): boolean {
	const thresholdMs = 1000 * 60 * 60 * 24 * thresholdDays;
	return Date.now() >= expiresAt.getTime() - thresholdMs;
}

export function isSessionExpired(expiresAt: Date): boolean {
	return Date.now() >= expiresAt.getTime();
}

/**
 * Create a new session for a user
 *
 * @param token - Session token
 * @param userId - User ID
 * @returns Created session
 */
export async function createSession(token: string, userId: string) {
	const sessionId = createSessionId(token);
	const session = {
		id: sessionId,
		userId,
		expiresAt: getSessionExpiry(SESSION_EXPIRY_DAYS),
	};
	await db.insert(sessions).values(session);
	return session;
}

/**
 * Validate a session token
 *
 * Checks if session exists, is not expired, and renews if expiring soon
 *
 * @param token - Session token
 * @returns Session validation result with user data
 */
export async function validateSessionToken(
	token: string,
): Promise<SessionValidationResult> {
	const sessionId = createSessionId(token);

	const result = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		with: {
			user: true,
		},
	});

	if (!result) {
		return { session: null, user: null };
	}

	const { user, ...session } = result;

	// Check if session has expired
	if (isSessionExpired(session.expiresAt)) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return { session: null, user: null };
	}

	if (
		isSessionExpiringSoon(session.expiresAt, SESSION_RENEWAL_THRESHOLD_DAYS)
	) {
		const newExpiresAt = getSessionExpiry(SESSION_EXPIRY_DAYS);
		await db
			.update(sessions)
			.set({ expiresAt: newExpiresAt })
			.where(eq(sessions.id, sessionId));
		session.expiresAt = newExpiresAt;
	}

	return { session, user };
}

export const getCurrentSession = cache(async (): Promise<SessionValidationResult> => {
	const token = await getSessionTokenCookie(SESSION_COOKIE_NAME);

	if (!token) {
		return { session: null, user: null };
	}

	return validateSessionToken(token);
});

/**
 * Invalidate a session by ID
 *
 * @param sessionId - Session ID to invalidate
 */
export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Invalidate all sessions for a user
 *
 * Useful for "logout everywhere" functionality
 *
 * @param userId - User ID
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}
