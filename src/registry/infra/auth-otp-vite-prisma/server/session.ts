import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { prisma } from "../db";
import { verifyToken, generateRefreshToken } from "@/lib/server/auth/server/jwt";
import type { User } from "@/lib/server/auth/types";

/**
 * Verify an access token (JWT)
 *
 * Access tokens are validated locally without database hits for performance
 * Only the signature and expiry are checked
 *
 * @param token - Access token (JWT)
 * @returns User if valid, null otherwise
 */
export async function verifyAccessToken(token: string): Promise<User | null> {
	const payload = await verifyToken(token);

	if (!payload || payload.type !== "access") {
		return null;
	}

	// Optionally fetch fresh user data from database
	// For better performance, you can return just the payload data
	// For fresh data (email changes, etc.), fetch from DB
	const user = await prisma.user.findUnique({
		where: { id: payload.sub },
	});

	return user;
}

/**
 * Verify a refresh token (JWT + database validation)
 *
 * Refresh tokens are validated against the database to check for revocation
 * This is essential for "logout everywhere" and security
 *
 * @param token - Refresh token (JWT)
 * @returns User ID if valid, null otherwise
 */
export async function verifyRefreshToken(token: string): Promise<string | null> {
	const payload = await verifyToken(token);

	if (!payload || payload.type !== "refresh") {
		return null;
	}

	const tokenHash = createTokenHash(token);

	// Check database for revocation
	const dbToken = await prisma.refreshToken.findUnique({
		where: { tokenHash },
	});

	if (!dbToken || dbToken.revoked) {
		return null;
	}

	// Check expiry
	if (Date.now() >= dbToken.expiresAt.getTime()) {
		// Clean up expired token
		await prisma.refreshToken.delete({ where: { tokenHash } });
		return null;
	}

	return payload.sub; // userId
}

/**
 * Create a SHA256 hash of a token for storage
 *
 * We store hashes instead of plain tokens for security
 * If the database is compromised, tokens can't be used
 *
 * @param token - Token to hash
 * @returns Hex-encoded hash
 */
export function createTokenHash(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

/**
 * Store a refresh token in the database
 *
 * @param token - Refresh token (JWT)
 * @param userId - User ID
 * @param expiresAt - Expiry date
 */
export async function storeRefreshToken(
	token: string,
	userId: string,
	expiresAt: Date,
): Promise<void> {
	const tokenHash = createTokenHash(token);

	await prisma.refreshToken.create({
		data: {
			userId,
			tokenHash,
			expiresAt,
		},
	});
}

/**
 * Revoke a refresh token by its hash
 *
 * Used for logout functionality
 *
 * @param tokenHash - SHA256 hash of the refresh token
 */
export async function revokeRefreshToken(tokenHash: string): Promise<void> {
	await prisma.refreshToken.updateMany({
		where: { tokenHash },
		data: { revoked: true },
	});
}

/**
 * Revoke all refresh tokens for a user
 *
 * Useful for "logout everywhere" functionality or security incidents
 *
 * @param userId - User ID
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
	await prisma.refreshToken.updateMany({
		where: { userId },
		data: { revoked: true },
	});
}

/**
 * Delete expired refresh tokens from the database
 *
 * Run this periodically (e.g., via cron job) to clean up old tokens
 */
export async function cleanupExpiredTokens(): Promise<void> {
	await prisma.refreshToken.deleteMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
		},
	});
}

/**
 * Get all active refresh tokens for a user
 *
 * Useful for showing "active sessions" in user settings
 *
 * @param userId - User ID
 * @returns Array of refresh tokens
 */
export async function getUserRefreshTokens(userId: string) {
	return await prisma.refreshToken.findMany({
		where: {
			userId,
			revoked: false,
			expiresAt: {
				gte: new Date(),
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
}

/**
 * Extract access token from cookies (for backend frameworks)
 *
 * This is a helper function that should be adapted based on your backend framework
 * (Express, Hono, Fastify, etc.)
 *
 * @example
 * ```typescript
 * // Hono
 * import { getCookie } from 'hono/cookie';
 * const token = getCookie(c, 'access_token');
 *
 * // Express
 * const token = req.cookies.access_token;
 * ```
 */
export function extractAccessTokenFromCookies(cookies: Record<string, string>): string | null {
	return cookies.access_token || null;
}

/**
 * Extract refresh token from cookies (for backend frameworks)
 */
export function extractRefreshTokenFromCookies(cookies: Record<string, string>): string | null {
	return cookies.refresh_token || null;
}
