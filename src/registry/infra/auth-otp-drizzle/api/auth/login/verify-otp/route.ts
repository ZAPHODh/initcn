import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/auth/db";
import { users, verificationCodes } from "@/lib/server/auth/schemas/drizzle.schema";
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
import {
	extractClientIP,
	normalizeEmail,
} from "@/lib/server/auth/server/utils";
import { setSessionTokenCookie } from "@/lib/server/auth/server/cookies";
import type {
	VerifyOTPRequest,
	VerifyOTPResponse,
} from "@/lib/server/auth/types";
import { eq, desc } from "drizzle-orm";

const MAX_FAILED_ATTEMPTS = 10;
const FAILED_ATTEMPTS_WINDOW_SECONDS = 3600;
const EMAIL_RATE_LIMIT = { requests: 10, window: "15 m" as const };
const IP_RATE_LIMIT = { requests: 50, window: "15 m" as const };

export async function POST(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as VerifyOTPRequest;
		const email = normalizeEmail(body.email);
		const code = body.code?.trim();

		if (!email || !code) {
			return Response.json(
				{
					success: false,
					message: "Email and code are required",
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		const clientIP = extractClientIP(request);

		const failedAttemptResult = await trackFailedAttempt(
			`verify-otp:${email}`,
			MAX_FAILED_ATTEMPTS,
			FAILED_ATTEMPTS_WINDOW_SECONDS,
		);

		if (failedAttemptResult.locked) {
			console.warn(`Account locked due to too many failed attempts: ${email}`);
			return Response.json(
				{
					success: false,
					message:
						"Account temporarily locked due to too many failed attempts. Please try again later.",
					attemptsRemaining: 0,
				} satisfies VerifyOTPResponse,
				{ status: 429 },
			);
		}

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, EMAIL_RATE_LIMIT.requests, EMAIL_RATE_LIMIT.window),
			rateLimitByIP(clientIP, IP_RATE_LIMIT.requests, IP_RATE_LIMIT.window),
		]);

		if (!emailRateLimit.success) {
			console.warn(`Rate limit exceeded for verify-otp: email=${email}`);
			return Response.json(
				{
					success: false,
					message: "Too many verification attempts. Please try again later.",
				} satisfies VerifyOTPResponse,
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": emailRateLimit.limit.toString(),
						"X-RateLimit-Remaining": emailRateLimit.remaining.toString(),
						"X-RateLimit-Reset": emailRateLimit.reset.toString(),
					},
				},
			);
		}

		if (!ipRateLimit.success) {
			console.warn(`Rate limit exceeded for verify-otp: ip=${clientIP}`);
			return Response.json(
				{
					success: false,
					message: "Too many requests from your IP. Please try again later.",
				} satisfies VerifyOTPResponse,
				{
					status: 429,
					headers: {
						"X-RateLimit-Limit": ipRateLimit.limit.toString(),
						"X-RateLimit-Remaining": ipRateLimit.remaining.toString(),
						"X-RateLimit-Reset": ipRateLimit.reset.toString(),
					},
				},
			);
		}

		const user = await db.query.users.findFirst({
			where: eq(users.email, email),
		});

		if (!user) {
			console.warn(`Verification attempt for non-existent user: ${email}`);
			return Response.json(
				{
					success: false,
					message: "Invalid credentials",
					attemptsRemaining: failedAttemptResult.remaining,
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		const verificationCode = await db.query.verificationCodes.findFirst({
			where: eq(verificationCodes.userId, user.id),
			orderBy: [desc(verificationCodes.expiresAt)],
		});

		if (!verificationCode) {
			console.warn(`No verification code found for user: ${email}`);
			return Response.json(
				{
					success: false,
					message: "Invalid or expired OTP",
					attemptsRemaining: failedAttemptResult.remaining,
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		if (verificationCode.code !== code) {
			console.warn(
				`Invalid OTP for ${email}. Attempts: ${failedAttemptResult.attempts}/${MAX_FAILED_ATTEMPTS}`,
			);
			return Response.json(
				{
					success: false,
					message: "Invalid OTP",
					attemptsRemaining: failedAttemptResult.remaining,
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		if (isOTPExpired(verificationCode.expiresAt)) {
			console.warn(`Expired OTP for ${email}`);
			await db.delete(verificationCodes).where(eq(verificationCodes.id, verificationCode.id));
			return Response.json(
				{
					success: false,
					message: "OTP has expired. Please request a new one.",
					attemptsRemaining: failedAttemptResult.remaining,
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		await resetFailedAttempts(`verify-otp:${email}`);

		await db.delete(verificationCodes).where(eq(verificationCodes.id, verificationCode.id));

		await db.delete(verificationCodes).where(eq(verificationCodes.userId, user.id));

		if (!user.emailVerified) {
			await db
				.update(users)
				.set({ emailVerified: true })
				.where(eq(users.id, user.id));
		}

		const sessionToken = generateSessionToken();
		await createSession(sessionToken, user.id);

		await setSessionTokenCookie(
			sessionToken,
			new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			SESSION_COOKIE_NAME,
		);

		revalidatePath("/", "layout");

		return Response.json(
			{
				success: true,
				message: "Login successful",
			} satisfies VerifyOTPResponse,
			{ status: 200 },
		);
	} catch (error) {
		console.error("Verify OTP error:", error);
		return Response.json(
			{
				success: false,
				message: "Internal server error",
			} satisfies VerifyOTPResponse,
			{ status: 500 },
		);
	}
}
