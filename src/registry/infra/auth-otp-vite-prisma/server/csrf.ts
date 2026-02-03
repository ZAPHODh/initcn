import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { CRYPTO_CONFIG } from "@/lib/constants/auth";

const CSRF_SECRET = process.env.CSRF_SECRET;
if (!CSRF_SECRET) {
	throw new Error(
		"CSRF_SECRET environment variable must be set. Generate one with: openssl rand -hex 32",
	);
}

const CSRF_TOKEN_LENGTH = CRYPTO_CONFIG.CSRF_TOKEN_LENGTH;

/**
 * Generate a random CSRF token.
 */
export function generateCSRFToken(): string {
	return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Sign a CSRF token using HMAC-SHA256.
 */
export function signCSRFToken(token: string): string {
	const hmac = createHmac("sha256", CSRF_SECRET);
	hmac.update(token);
	return hmac.digest("hex");
}

/**
 * Verify a CSRF token and its signature using timing-safe comparison.
 */
export function verifyCSRFToken(token: string, signature: string): boolean {
	try {
		const expected = signCSRFToken(token);
		const expectedBuffer = Buffer.from(expected, "hex");
		const signatureBuffer = Buffer.from(signature, "hex");

		if (expectedBuffer.length !== signatureBuffer.length) {
			return false;
		}

		return timingSafeEqual(expectedBuffer, signatureBuffer);
	} catch (error) {
		console.error("Error verifying CSRF token:", error);
		return false;
	}
}

/**
 * Validate CSRF token from request headers.
 * Expects X-CSRF-Token and X-CSRF-Signature headers.
 */
export function validateCSRFFromRequest(request: Request): boolean {
	const token = request.headers.get("X-CSRF-Token");
	const signature = request.headers.get("X-CSRF-Signature");

	if (!token || !signature) {
		return false;
	}

	return verifyCSRFToken(token, signature);
}
