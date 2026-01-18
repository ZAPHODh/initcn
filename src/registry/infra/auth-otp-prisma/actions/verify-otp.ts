"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/server/auth/db";
import {
	rateLimitByEmail,
	rateLimitByIP,
	trackFailedAttempt,
	resetFailedAttempts,
} from "@/lib/server/auth/rate-limit";
import {
	generateSessionToken,
	createSession,
	SESSION_COOKIE_NAME,
} from "@/lib/server/auth/server/session";
import { isOTPExpired } from "@/lib/server/auth/server/otp";
import { normalizeEmail } from "@/lib/server/auth/server/utils";
import { setSessionTokenCookie } from "@/lib/server/auth/server/cookies";
import { actionClient } from "@/lib/server/auth/client/safe-action";

const MAX_FAILED_ATTEMPTS = 10;
const FAILED_ATTEMPTS_WINDOW_SECONDS = 3600;
const EMAIL_RATE_LIMIT = { requests: 10, window: "15 m" as const };
const IP_RATE_LIMIT = { requests: 50, window: "15 m" as const };

const verifyOTPSchema = z.object({
	email: z.string().email("Invalid email address"),
	code: z.string().length(6, "OTP must be 6 digits"),
});

export const verifyOTPAction = actionClient
	.metadata({ actionName: "verify-otp" })
	.schema(verifyOTPSchema)
	.action(async ({ parsedInput: { email, code } }) => {
		const normalizedEmail = normalizeEmail(email);
		const trimmedCode = code.trim();

		if (!normalizedEmail || !trimmedCode) {
			return {
				success: false,
				error: "Email and code are required",
			};
		}

		const headersList = await headers();
		const forwardedFor = headersList.get("x-forwarded-for");
		const realIp = headersList.get("x-real-ip");
		const clientIP = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "unknown";

		const failedAttemptResult = await trackFailedAttempt(
			`verify-otp:${normalizedEmail}`,
			MAX_FAILED_ATTEMPTS,
			FAILED_ATTEMPTS_WINDOW_SECONDS,
		);

		if (failedAttemptResult.locked) {
			return {
				success: false,
				error: "Account temporarily locked due to too many failed attempts. Please try again later.",
				attemptsRemaining: 0,
			};
		}

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(normalizedEmail, EMAIL_RATE_LIMIT.requests, EMAIL_RATE_LIMIT.window),
			rateLimitByIP(clientIP, IP_RATE_LIMIT.requests, IP_RATE_LIMIT.window),
		]);

		if (!emailRateLimit.success) {
			return {
				success: false,
				error: "Too many verification attempts. Please try again later.",
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

		const user = await prisma.user.findUnique({
			where: { email: normalizedEmail },
		});

		if (!user) {
			return {
				success: false,
				error: "Invalid credentials",
				attemptsRemaining: failedAttemptResult.remaining,
			};
		}

		const verificationCode = await prisma.verificationCode.findFirst({
			where: { userId: user.id },
			orderBy: { expiresAt: "desc" },
		});

		if (!verificationCode) {
			return {
				success: false,
				error: "Invalid or expired OTP",
				attemptsRemaining: failedAttemptResult.remaining,
			};
		}

		if (verificationCode.code !== trimmedCode) {
			return {
				success: false,
				error: "Invalid OTP",
				attemptsRemaining: failedAttemptResult.remaining,
			};
		}

		if (isOTPExpired(verificationCode.expiresAt)) {
			await prisma.verificationCode.delete({
				where: { id: verificationCode.id },
			});
			return {
				success: false,
				error: "OTP has expired. Please request a new one.",
				attemptsRemaining: failedAttemptResult.remaining,
			};
		}

		await resetFailedAttempts(`verify-otp:${normalizedEmail}`);

		await prisma.verificationCode.delete({
			where: { id: verificationCode.id },
		});

		await prisma.session.deleteMany({
			where: { userId: user.id },
		});

		if (!user.emailVerified) {
			await prisma.user.update({
				where: { id: user.id },
				data: { emailVerified: true },
			});
		}

		const sessionToken = generateSessionToken();
		await createSession(sessionToken, user.id);

		await setSessionTokenCookie(
			sessionToken,
			new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			SESSION_COOKIE_NAME,
		);

		revalidatePath("/", "layout");

		redirect("/dashboard");
	});
