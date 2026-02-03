import { validateOTP } from "@/lib/server/auth/verification";
import { getUserById, updateUser } from "@/lib/server/auth/user";
import { storeRefreshToken } from "@/lib/server/auth/session";
import {
	rateLimitByEmail,
	rateLimitByIP,
	trackFailedAttempt,
	resetFailedAttempts,
} from "@/lib/server/auth/rate-limit";
import { normalizeEmail, validateEmail, extractClientIP } from "@/lib/server/utils";
import {
	generateAccessToken,
	generateRefreshToken,
	getTokenExpiry,
} from "@/lib/server/jwt";
import { serializeSecureCookie } from "@/lib/server/auth/cookie-utils";
import { validateCSRFFromRequest } from "@/lib/server/auth/csrf";
import { OTP_CONFIG, RATE_LIMITS, TOKEN_CONFIG } from "@/lib/constants/auth";
import type { VerifyOTPRequest, VerifyOTPResponse } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
	// CSRF validation (SEC-002 fix)
	if (!validateCSRFFromRequest(request)) {
		return Response.json(
			{
				success: false,
				message: "Invalid CSRF token",
			} satisfies VerifyOTPResponse,
			{ status: 403 },
		);
	}

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

		if (!validateEmail(email)) {
			return Response.json(
				{
					success: false,
					message: "Invalid email address",
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		if (!/^\d{6}$/.test(code)) {
			return Response.json(
				{
					success: false,
					message: "Invalid verification code format",
				} satisfies VerifyOTPResponse,
				{ status: 400 },
			);
		}

		const clientIP = extractClientIP(request);

		// Check failed attempts first
		const failedAttemptResult = await trackFailedAttempt(
			`verify-otp:${email}`,
			OTP_CONFIG.MAX_FAILED_ATTEMPTS,
			OTP_CONFIG.FAILED_ATTEMPTS_WINDOW_SECONDS,
		);

		if (failedAttemptResult.locked) {
			console.warn(`Account locked due to too many failed attempts: ${email}`);
			return Response.json(
				{
					success: false,
					message:
						"Account temporarily locked. Please request a new code.",
					attemptsRemaining: 0,
				} satisfies VerifyOTPResponse,
				{ status: 429 },
			);
		}

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, RATE_LIMITS.VERIFY_OTP_EMAIL.requests, RATE_LIMITS.VERIFY_OTP_EMAIL.window),
			rateLimitByIP(clientIP, RATE_LIMITS.VERIFY_OTP_IP.requests, RATE_LIMITS.VERIFY_OTP_IP.window),
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

		const userId = await validateOTP(email, code);

		if (!userId) {
			// Invalid OTP - don't reveal if user exists
			console.warn(
				`Invalid OTP for ${email}. Attempts: ${failedAttemptResult.attempts}/${OTP_CONFIG.MAX_FAILED_ATTEMPTS}`,
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
			await updateUser(userId, { emailVerified: true });
			user.emailVerified = true;
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
			TOKEN_CONFIG.ACCESS_TOKEN_MAX_AGE,
		);
		const refreshTokenCookie = serializeSecureCookie(
			"refresh_token",
			refreshToken,
			TOKEN_CONFIG.REFRESH_TOKEN_MAX_AGE,
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
