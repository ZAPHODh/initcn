import { sha256 } from "@oslojs/crypto/sha2";
import {
	encodeBase32LowerCaseNoPadding,
	encodeHexLowerCase,
} from "@oslojs/encoding";
import { prisma } from "@/lib/server/auth/db";
import type { SessionValidationResult } from "@/lib/server/auth/types";

export const SESSION_EXPIRY_DAYS = 30;
export const SESSION_RENEWAL_THRESHOLD_DAYS = 15;
export const SESSION_COOKIE_NAME = "session";

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
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

export async function createSession(token: string, userId: string) {
	const sessionId = createSessionId(token);
	const session = {
		id: sessionId,
		userId,
		expiresAt: getSessionExpiry(SESSION_EXPIRY_DAYS),
	};
	await prisma.session.create({ data: session });
	return session;
}

export async function validateSessionToken(
	token: string,
): Promise<SessionValidationResult> {
	const sessionId = createSessionId(token);

	const result = await prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true },
	});

	if (!result) {
		return { session: null, user: null };
	}

	const { user, ...session } = result;

	if (isSessionExpired(session.expiresAt)) {
		await prisma.session.delete({ where: { id: sessionId } });
		return { session: null, user: null };
	}

	if (isSessionExpiringSoon(session.expiresAt, SESSION_RENEWAL_THRESHOLD_DAYS)) {
		const newExpiresAt = getSessionExpiry(SESSION_EXPIRY_DAYS);
		await prisma.session.update({
			where: { id: sessionId },
			data: { expiresAt: newExpiresAt },
		});
		session.expiresAt = newExpiresAt;
	}

	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await prisma.session.delete({ where: { id: sessionId } });
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
	await prisma.session.deleteMany({ where: { userId } });
}
