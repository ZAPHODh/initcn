"use server";

import { z } from "zod";
import { prisma } from "@/lib/server/auth/db";
import { sendOTP } from "@/lib/server/auth/mail";
import { rateLimitByEmail, rateLimitByIP } from "@/lib/server/auth/rate-limit";
import { generateOTP, getOTPExpiry, OTP_LENGTH, OTP_EXPIRY_MINUTES } from "@/lib/server/auth/server/otp";
import { validateEmail, normalizeEmail, extractClientIP } from "@/lib/server/auth/server/utils";
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

		let user = await prisma.user.findUnique({
			where: { email: normalizedEmail },
		});

		if (!user) {
			user = await prisma.user.create({
				data: {
					email: normalizedEmail,
					emailVerified: false,
				},
			});
		}

		await prisma.verificationCode.deleteMany({
			where: { userId: user.id },
		});

		const code = generateOTP(OTP_LENGTH);
		const expiresAt = getOTPExpiry(OTP_EXPIRY_MINUTES);

		await prisma.verificationCode.create({
			data: {
				userId: user.id,
				code,
				expiresAt,
			},
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
