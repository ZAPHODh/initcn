import { validateOTP } from "@/lib/server/auth/verification";
import { getUserById, updateUser } from "@/lib/server/auth/user";
import { storeRefreshToken } from "@/lib/server/auth/session";
import { rateLimitByEmail, rateLimitByIP } from "@/lib/server/auth/rate-limit";
import { normalizeEmail, validateEmail } from "@/lib/server/auth/server/utils";
import {
	generateAccessToken,
	generateRefreshToken,
	getTokenExpiry,
} from "@/lib/server/auth/server/jwt";
import type { VerifyOTPRequest, VerifyOTPResponse } from "@/lib/server/auth/types";

/**
 * Verify OTP handler (framework-agnostic)
 *
 * This function validates the OTP and generates JWT tokens
 * The backend framework must set the tokens as httpOnly cookies
 *
 * @example
 * ```typescript
 * // Hono
 * import { setCookie } from 'hono/cookie';
 *
 * app.post('/api/auth/verify-otp', async (c) => {
 *   const body = await c.req.json();
 *   const clientIP = c.req.header('x-forwarded-for') || 'unknown';
 *   const result = await verifyOTPHandler({
 *     email: body.email,
 *     code: body.code,
 *     clientIP,
 *   });
 *
 *   if (result.success && result.accessToken && result.refreshToken) {
 *     // Set httpOnly cookies
 *     setCookie(c, 'access_token', result.accessToken, {
 *       httpOnly: true,
 *       secure: true,
 *       sameSite: 'lax',
 *       maxAge: 15 * 60, // 15 minutes
 *     });
 *
 *     setCookie(c, 'refresh_token', result.refreshToken, {
 *       httpOnly: true,
 *       secure: true,
 *       sameSite: 'lax',
 *       maxAge: 30 * 24 * 60 * 60, // 30 days
 *     });
 *
 *     // Remove tokens from response (they're in cookies now)
 *     delete result.accessToken;
 *     delete result.refreshToken;
 *   }
 *
 *   return c.json(result, result.success ? 200 : 400);
 * });
 * ```
 */
export async function verifyOTPHandler(request: {
	email: string;
	code: string;
	clientIP: string;
}): Promise<
	VerifyOTPResponse & { accessToken?: string; refreshToken?: string }
> {
	try {
		// 1. Validate email
		const email = normalizeEmail(request.email);

		if (!email || !validateEmail(email)) {
			return {
				success: false,
				message: "Invalid email address",
				error: "INVALID_EMAIL",
			};
		}

		// 2. Validate code format (6 digits)
		if (!/^\d{6}$/.test(request.code)) {
			return {
				success: false,
				message: "Invalid verification code format",
				error: "INVALID_CODE_FORMAT",
			};
		}

		// 3. Rate limiting
		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, 10, "15 m"), // 10 verification attempts per 15 minutes
			rateLimitByIP(request.clientIP, 50, "15 m"), // 50 attempts per IP
		]);

		if (!emailRateLimit.success) {
			return {
				success: false,
				message: "Too many verification attempts. Please try again later.",
				error: "RATE_LIMIT_EXCEEDED",
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
				message: "Too many attempts from this IP. Please try again later.",
				error: "RATE_LIMIT_EXCEEDED",
				rateLimit: {
					limit: ipRateLimit.limit,
					remaining: ipRateLimit.remaining,
					reset: ipRateLimit.reset,
				},
			};
		}

		// 4. Validate OTP
		const userId = await validateOTP(email, request.code);

		if (!userId) {
			return {
				success: false,
				message: "Invalid or expired verification code",
				error: "INVALID_CODE",
			};
		}

		// 5. Get user
		const user = await getUserById(userId);

		if (!user) {
			return {
				success: false,
				message: "User not found",
				error: "USER_NOT_FOUND",
			};
		}

		// 6. Mark email as verified
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

		// 9. Return success with tokens
		// Backend framework should set these as httpOnly cookies
		return {
			success: true,
			message: "Login successful",
			user,
			accessToken,
			refreshToken,
			rateLimit: {
				limit: emailRateLimit.limit,
				remaining: emailRateLimit.remaining,
				reset: emailRateLimit.reset,
			},
		};
	} catch (error) {
		console.error("Error verifying OTP:", error);
		return {
			success: false,
			message: "Failed to verify code",
			error: "INTERNAL_ERROR",
		};
	}
}
