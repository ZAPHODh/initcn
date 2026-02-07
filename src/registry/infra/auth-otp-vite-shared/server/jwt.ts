import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "@/lib/server/auth/types";

// Environment variable checks
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
	throw new Error("JWT_SECRET environment variable is not set");
}

// Convert secret to Uint8Array for jose
const secretKey = new TextEncoder().encode(JWT_SECRET);

// Token expiry durations
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "30d"; // 30 days

/**
 * Parse duration string (e.g., "15m", "30d", "1h") to seconds
 */
function parseTokenExpiry(duration: string): number {
	const match = duration.match(/^(\d+)([smhd])$/);
	if (!match) {
		throw new Error(`Invalid token expiry format: ${duration}`);
	}

	const value = Number.parseInt(match[1], 10);
	const unit = match[2];

	const multipliers: Record<string, number> = {
		s: 1,
		m: 60,
		h: 60 * 60,
		d: 24 * 60 * 60,
	};

	return value * multipliers[unit];
}

/**
 * Generate an access token (short-lived, 15 minutes)
 * Access tokens are validated locally without database hits
 */
export async function generateAccessToken(
	userId: string,
	email: string,
): Promise<string> {
	const expirySeconds = parseTokenExpiry(ACCESS_TOKEN_EXPIRY);

	const token = await new SignJWT({
		email,
		type: "access",
	})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(userId)
		.setIssuedAt()
		.setExpirationTime(Math.floor(Date.now() / 1000) + expirySeconds)
		.sign(secretKey);

	return token;
}

/**
 * Generate a refresh token (long-lived, 30 days)
 * Refresh tokens are validated against the database for revocation
 */
export async function generateRefreshToken(userId: string): Promise<string> {
	const expirySeconds = parseTokenExpiry(REFRESH_TOKEN_EXPIRY);

	const token = await new SignJWT({
		type: "refresh",
	})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(userId)
		.setIssuedAt()
		.setExpirationTime(Math.floor(Date.now() / 1000) + expirySeconds)
		.sign(secretKey);

	return token;
}

/**
 * Verify and decode a JWT token
 * Returns the payload if valid, null otherwise
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
	try {
		const { payload } = await jwtVerify(token, secretKey);

		// Validate required fields
		if (!payload.sub || typeof payload.sub !== "string") {
			return null;
		}

		if (
			!payload.type ||
			(payload.type !== "access" && payload.type !== "refresh")
		) {
			return null;
		}

		return {
			sub: payload.sub,
			email: (payload.email as string) || "",
			exp: payload.exp || 0,
			iat: payload.iat || 0,
			type: payload.type as "access" | "refresh",
		};
	} catch (error) {
		// Token verification failed (invalid signature, expired, etc.)
		return null;
	}
}

/**
 * Decode a JWT token without verification (client-side use only)
 * WARNING: Do NOT use this for authentication - only for reading non-sensitive data
 */
export function decodeJWTUnsafe(token: string): JWTPayload | null {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) {
			return null;
		}

		const payload = JSON.parse(
			Buffer.from(parts[1], "base64url").toString("utf-8"),
		);

		return {
			sub: payload.sub,
			email: payload.email || "",
			exp: payload.exp || 0,
			iat: payload.iat || 0,
			type: payload.type || "access",
		};
	} catch (error) {
		return null;
	}
}

/**
 * Get the expiration date for a token duration
 */
export function getTokenExpiry(duration: string): Date {
	const seconds = parseTokenExpiry(duration);
	return new Date(Date.now() + seconds * 1000);
}
