import { validateOTP } from "@/lib/server/auth/verification";
import { getUserById, updateUser } from "@/lib/server/auth/user";
import {
	generateSessionToken,
	createSession,
	invalidateAllUserSessions,
} from "@/lib/server/auth/session";
import { rateLimitByEmail, rateLimitByIP } from "@/lib/server/auth/rate-limit";
import { normalizeEmail, validateEmail } from "@/lib/server/auth/server/utils";
import type { VerifyOTPRequest, VerifyOTPResponse } from "@/lib/server/auth/types";

/**
 * Verify OTP handler (framework-agnostic)
 *
 * This function validates the OTP and creates a session
 * The backend framework must set the session token as an httpOnly cookie
 *
 * @example
 * ```typescript
 * // TanStack Start route
 * case "verify-otp": {
 *   const result = await verifyOTPHandler({ email, code, clientIP });
 *
 *   if (result.success && result.sessionToken) {
 *     const headers = new Headers();
 *     headers.set("Set-Cookie", `session=${result.sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
 *     return json(result, { status: 200, headers });
 *   }
 *
 *   return json(result, { status: result.success ? 200 : 400 });
 * }
 * ```
 */
export async function verifyOTPHandler(request: {
	email: string;
	code: string;
	clientIP: string;
}): Promise<VerifyOTPResponse & { sessionToken?: string }> {
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

		// 7. Invalidate all existing sessions and create new one
		await invalidateAllUserSessions(userId);
		const sessionToken = generateSessionToken();
		await createSession(sessionToken, userId);

		// Return success with session token
		// Backend framework should set this as an httpOnly cookie
		return {
			success: true,
			message: "Login successful",
			sessionToken,
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
