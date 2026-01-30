import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { prisma } from "@/lib/server/auth/db";
import { verifyToken, generateRefreshToken } from "@/lib/server/jwt";
import type { User } from "@/lib/types";

export async function verifyAccessToken(token: string): Promise<User | null> {
	const payload = await verifyToken(token);

	if (!payload || payload.type !== "access") {
		return null;
	}

	const user = await prisma.user.findUnique({
		where: { id: payload.sub },
	});

	return user;
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
	const payload = await verifyToken(token);

	if (!payload || payload.type !== "refresh") {
		return null;
	}

	const tokenHash = createTokenHash(token);

	const dbToken = await prisma.refreshToken.findUnique({
		where: { tokenHash },
	});

	if (!dbToken || dbToken.revoked) {
		return null;
	}

	if (Date.now() >= dbToken.expiresAt.getTime()) {
		await prisma.refreshToken.delete({ where: { tokenHash } });
		return null;
	}

	return payload.sub;
}

export function createTokenHash(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

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

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
	await prisma.refreshToken.updateMany({
		where: { tokenHash },
		data: { revoked: true },
	});
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
	await prisma.refreshToken.updateMany({
		where: { userId },
		data: { revoked: true },
	});
}

export async function cleanupExpiredTokens(): Promise<void> {
	await prisma.refreshToken.deleteMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
		},
	});
}

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

export function extractAccessTokenFromCookies(cookies: Record<string, string>): string | null {
	return cookies.access_token || null;
}

export function extractRefreshTokenFromCookies(cookies: Record<string, string>): string | null {
	return cookies.refresh_token || null;
}
