import { prisma } from "@/lib/server/auth/db";
import { getUserById } from "@/lib/server/auth/user";
import { storeRefreshToken } from "@/lib/server/auth/session";
import {
	rateLimitByEmail,
	rateLimitByIP,
	trackFailedAttempt,
	resetFailedAttempts,
} from "@/lib/server/auth/rate-limit";
import { normalizeEmail, extractClientIP } from "@/lib/server/utils";
import {
	generateAccessToken,
	generateRefreshToken,
	getTokenExpiry,
} from "@/lib/server/jwt";
import { isOTPExpired } from "@/lib/server/otp";
import { serializeSecureCookie } from "@/lib/server/auth/cookie-utils";
import type { VerifyOTPRequest, VerifyOTPResponse } from "@/lib/types";

const MAX_FAILED_ATTEMPTS = 10;
const FAILED_ATTEMPTS_WINDOW_SECONDS = 3600; // 1 hour
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

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

		const EMAIL_RATE_LIMIT = { requests: 10, window: "15 m" as const };
		const IP_RATE_LIMIT = { requests: 50, window: "15 m" as const };

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

		// Validate OTP (inline)
		const verificationCode = await prisma.verificationCode.findFirst({
			where: { email },
			orderBy: { createdAt: "desc" },
		});

		if (!verificationCode) {
			console.warn(
				`Invalid OTP for ${email}. Attempts: ${failedAttemptResult.attempts}/${MAX_FAILED_ATTEMPTS}`,
			);
			return Response.json(
				{
					success: false,
					message: "Invalid or expired verification code",
					attemptsRemaining: failedAttemptResult.remaining,
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		if (isOTPExpired(verificationCode.expiresAt)) {
			return Response.json(
				{
					success: false,
					message: "Verification code has expired",
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
					message: "Invalid verification code",
					attemptsRemaining: failedAttemptResult.remaining,
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		const userId = verificationCode.userId;

		// Delete verification code
		await prisma.verificationCode.delete({
			where: { id: verificationCode.id },
		});

		// Reset failed attempts on success
		await resetFailedAttempts(`verify-otp:${email}`);

		const user = await getUserById(userId);

		if (!user) {
			console.warn(`User not found after OTP validation: ${userId}`);
			return Response.json(
				{
					success: false,
					message: "User not found",
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		if (!user.emailVerified) {
			await prisma.user.update({
				where: { id: user.id },
				data: { emailVerified: true },
			});
		}

		const [accessToken, refreshToken] = await Promise.all([
			generateAccessToken(user.id, user.email),
			generateRefreshToken(user.id),
		]);

		const refreshTokenExpiry = getTokenExpiry(
			process.env.JWT_REFRESH_EXPIRY || "30d",
		);
		await storeRefreshToken(refreshToken, user.id, refreshTokenExpiry);

		// Set secure cookies
		const accessTokenCookie = serializeSecureCookie(
			"access_token",
			accessToken,
			ACCESS_TOKEN_MAX_AGE,
		);
		const refreshTokenCookie = serializeSecureCookie(
			"refresh_token",
			refreshToken,
			REFRESH_TOKEN_MAX_AGE,
		);

		return Response.json(
			{
				success: true,
				message: "Login successful",
				user,
			} satisfies VerifyOTPResponse,
			{
				status: 200,
				headers: {
					"Set-Cookie": [accessTokenCookie, refreshTokenCookie].join(", "),
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
