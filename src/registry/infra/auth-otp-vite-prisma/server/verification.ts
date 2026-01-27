import { prisma } from "../db";
import { generateOTP, getOTPExpiry, isOTPExpired } from "@/lib/server/auth/server/otp";
import type { VerificationCode } from "@/lib/server/auth/types";

/**
 * Store an OTP verification code in the database
 *
 * Deletes any existing codes for the user before creating a new one
 *
 * @param userId - User ID
 * @param email - User email
 * @param code - OTP code
 * @param expiresAt - Expiry date
 * @returns Created verification code
 */
export async function storeOTP(
	userId: string,
	email: string,
	code: string,
	expiresAt: Date,
): Promise<VerificationCode> {
	// Delete existing codes for this user
	await prisma.emailVerificationCode.deleteMany({
		where: { userId },
	});

	return await prisma.emailVerificationCode.create({
		data: {
			userId,
			email,
			code,
			expiresAt,
		},
	});
}

/**
 * Generate and store a new OTP for a user
 *
 * @param userId - User ID
 * @param email - User email
 * @returns Generated OTP code (6 digits)
 */
export async function generateAndStoreOTP(
	userId: string,
	email: string,
): Promise<string> {
	const code = generateOTP();
	const expiresAt = getOTPExpiry();

	await storeOTP(userId, email, code, expiresAt);

	return code;
}

/**
 * Validate an OTP code
 *
 * Checks if the code exists, matches, and hasn't expired
 *
 * @param email - User email
 * @param code - OTP code to validate
 * @returns User ID if valid, null otherwise
 */
export async function validateOTP(
	email: string,
	code: string,
): Promise<string | null> {
	const verification = await prisma.emailVerificationCode.findFirst({
		where: { email, code },
		orderBy: { createdAt: "desc" },
	});

	if (!verification) {
		return null;
	}

	// Check expiry
	if (isOTPExpired(verification.expiresAt)) {
		// Clean up expired code
		await prisma.emailVerificationCode.delete({
			where: { id: verification.id },
		});
		return null;
	}

	// Valid code - delete it (one-time use)
	await prisma.emailVerificationCode.delete({
		where: { id: verification.id },
	});

	return verification.userId;
}

/**
 * Delete all OTP codes for a user
 *
 * @param userId - User ID
 */
export async function deleteUserOTPs(userId: string): Promise<void> {
	await prisma.emailVerificationCode.deleteMany({
		where: { userId },
	});
}

/**
 * Clean up expired OTP codes
 *
 * Run this periodically (e.g., via cron job)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
	await prisma.emailVerificationCode.deleteMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
		},
	});
}

/**
 * Get the most recent OTP for a user (for testing/debugging)
 *
 * @param userId - User ID
 * @returns Verification code if exists, null otherwise
 */
export async function getLatestOTPForUser(
	userId: string,
): Promise<VerificationCode | null> {
	return await prisma.emailVerificationCode.findFirst({
		where: { userId },
		orderBy: { createdAt: "desc" },
	});
}
