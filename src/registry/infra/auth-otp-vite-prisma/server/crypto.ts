import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { CRYPTO_CONFIG } from "@/lib/constants/auth";

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = CRYPTO_CONFIG.SALT_LENGTH;
const KEY_LENGTH = CRYPTO_CONFIG.KEY_LENGTH;

/**
 * Hash an OTP code using scrypt for secure storage.
 * Returns format: "salt:hash" where both are hex-encoded.
 */
export async function hashOTP(code: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH).toString("hex");
	const derivedKey = (await scryptAsync(code, salt, KEY_LENGTH)) as Buffer;
	return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify an OTP code against its hash using timing-safe comparison.
 * Prevents timing attacks by using constant-time comparison.
 */
export async function verifyOTP(code: string, hash: string): Promise<boolean> {
	try {
		const [salt, key] = hash.split(":");
		if (!salt || !key) {
			return false;
		}

		const keyBuffer = Buffer.from(key, "hex");
		const derivedKey = (await scryptAsync(code, salt, KEY_LENGTH)) as Buffer;

		// Timing-safe comparison to prevent timing attacks
		if (keyBuffer.length !== derivedKey.length) {
			return false;
		}

		return timingSafeEqual(keyBuffer, derivedKey);
	} catch (error) {
		console.error("Error verifying OTP:", error);
		return false;
	}
}
