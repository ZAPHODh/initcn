"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/server/auth/db";
import { users, verificationCodes } from "@/lib/server/auth/schemas/drizzle.schema";
import { sendOTP } from "@/lib/server/auth/mail";
import { rateLimitByEmail, rateLimitByIP } from "@/lib/server/auth/rate-limit";
import { generateOTP, getOTPExpiry, OTP_LENGTH, OTP_EXPIRY_MINUTES } from "@/lib/server/auth/server/otp";
import { validateEmail, normalizeEmail } from "@/lib/server/auth/server/utils";
import { actionClient } from "@/lib/server/auth/client/safe-action";
import { headers } from "next/headers";

const EMAIL_RATE_LIMIT = { requests: 3, window: "15 m" as const };
const IP_RATE_LIMIT = { requests: 20, window: "15 m" as const };

const sendOTPSchema = z.object({
	email: z.string().email("Invalid email address"),
});

export const sendOTPAction = actionClient
	.metadata({ actionName: "send-otp" })
	.schema(sendOTPSchema)
	.action(async ({ parsedInput: { email } }) => {
		const normalizedEmail = normalizeEmail(email);

		if (!normalizedEmail || !validateEmail(normalizedEmail)) {
			return {
				success: false,
				error: "Invalid email address",
			};
		}

		const headersList = await headers();
		const forwardedFor = headersList.get("x-forwarded-for");
		const realIp = headersList.get("x-real-ip");
		const clientIP = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "unknown";

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(normalizedEmail, EMAIL_RATE_LIMIT.requests, EMAIL_RATE_LIMIT.window),
			rateLimitByIP(clientIP, IP_RATE_LIMIT.requests, IP_RATE_LIMIT.window),
		]);

		if (!emailRateLimit.success) {
			return {
				success: false,
				error: "Too many OTP requests. Please try again later.",
				rateLimit: {
					limit: emailRateLimit.limit,
					remaining: emailRateLimit.remaining,
					reset: emailRateLimit.reset,
				},
			};
		}

		if (!ipRateLimit.success) {
			return {
				success: false,
				error: "Too many requests from your IP. Please try again later.",
				rateLimit: {
					limit: ipRateLimit.limit,
					remaining: ipRateLimit.remaining,
					reset: ipRateLimit.reset,
				},
			};
		}

		let user = await db.query.users.findFirst({
			where: eq(users.email, normalizedEmail),
		});

		if (!user) {
			const [newUser] = await db.insert(users).values({
				email: normalizedEmail,
				emailVerified: false,
			}).returning();
			user = newUser;
		}

		await db.delete(verificationCodes).where(eq(verificationCodes.userId, user.id));

		const code = generateOTP(OTP_LENGTH);
		const expiresAt = getOTPExpiry(OTP_EXPIRY_MINUTES);

		await db.insert(verificationCodes).values({
			userId: user.id,
			code,
			expiresAt,
		});

		await sendOTP({
			to: normalizedEmail,
			code,
			userName: user.name ?? undefined,
		});

		return {
			success: true,
			message: "OTP sent successfully",
		};
	});
