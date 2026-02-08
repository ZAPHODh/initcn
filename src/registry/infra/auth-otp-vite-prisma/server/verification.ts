import { prisma } from "@/lib/server/auth/db";
import { generateOTP, getOTPExpiry, isOTPExpired } from "@/lib/server/otp";
import type { VerificationCode } from "@/lib/types";

export async function storeOTP(
	userId: string,
	email: string,
	code: string,
	expiresAt: Date,
): Promise<VerificationCode> {
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

export async function generateAndStoreOTP(
	userId: string,
	email: string,
): Promise<string> {
	const code = generateOTP();
	const expiresAt = getOTPExpiry();

	await storeOTP(userId, email, code, expiresAt);

	return code;
}

export async function validateOTP(
	email: string,
	code: string,
): Promise<string | null> {
	const verification = await prisma.emailVerificationCode.findFirst({
		where: { email },
		orderBy: { createdAt: "desc" },
	});

	if (!verification) {
		return null;
	}

	if (isOTPExpired(verification.expiresAt)) {
		await prisma.emailVerificationCode.delete({
			where: { id: verification.id },
		});
		return null;
	}

	if (verification.code !== code) {
		return null;
	}

	// Delete OTP after successful verification
	await prisma.emailVerificationCode.delete({
		where: { id: verification.id },
	});

	return verification.userId;
}

export async function deleteUserOTPs(userId: string): Promise<void> {
	await prisma.emailVerificationCode.deleteMany({
		where: { userId },
	});
}

export async function cleanupExpiredOTPs(): Promise<void> {
	await prisma.emailVerificationCode.deleteMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
		},
	});
}

export async function getLatestOTPForUser(
	userId: string,
): Promise<VerificationCode | null> {
	return await prisma.emailVerificationCode.findFirst({
		where: { userId },
		orderBy: { createdAt: "desc" },
	});
}
