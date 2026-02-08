import { prisma } from "@/lib/server/auth/db";
import {
	generateSessionToken,
	createSession,
	getSessionExpiry,
} from "@/lib/server/auth/session";
import {
	rateLimitByEmail,
	rateLimitByIP,
	trackFailedAttempt,
	resetFailedAttempts,
} from "@/lib/server/auth/rate-limit";
import { normalizeEmail, extractClientIP } from "@/lib/server/utils";
import { isOTPExpired } from "@/lib/server/otp";
import { serializeSessionCookie } from "@/lib/server/auth/cookie-utils";
import type { VerifyOTPRequest, VerifyOTPResponse } from "@/lib/types";

const MAX_FAILED_ATTEMPTS = 10;
const FAILED_ATTEMPTS_WINDOW_SECONDS = 3600; // 1 hour
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

		// Check failed attempts first
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
						"Account temporarily locked due to too many failed attempts. Try again later.",
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

		const user = await prisma.user.findUnique({
			where: { email },
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

		const verificationCode = await prisma.verificationCode.findFirst({
			where: { userId: user.id },
			orderBy: { expiresAt: "desc" },
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
			await prisma.verificationCode.delete({
				where: { id: verificationCode.id },
			});
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

		await prisma.verificationCode.delete({
			where: { id: verificationCode.id },
		});

		// Invalidate all existing sessions for this user
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
		const sessionExpiry = getSessionExpiry();
		const sessionCookie = serializeSessionCookie(sessionToken, sessionExpiry);

		return Response.json(
			{
				success: true,
				message: "Login successful",
			} satisfies VerifyOTPResponse,
			{
				status: 200,
				headers: {
					"Set-Cookie": sessionCookie,
				},
			},
		);
	} catch (error) {
		console.error("Error verifying OTP:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to verify code",
			} satisfies VerifyOTPResponse,
			{ status: 500 },
		);
	}
}
