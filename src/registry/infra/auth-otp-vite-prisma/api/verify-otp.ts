import { validateOTP } from "../server/verification";
import { getUserById, updateUser } from "../server/user";
import { storeRefreshToken } from "../server/session";
import { rateLimitByEmail, rateLimitByIP } from "../rate-limit";
import { normalizeEmail, validateEmail } from "@/lib/server/utils";
import {
	generateAccessToken,
	generateRefreshToken,
	getTokenExpiry,
} from "@/lib/server/jwt";
import type { VerifyOTPRequest, VerifyOTPResponse } from "@/lib/types";

export async function verifyOTPHandler(request: {
	email: string;
	code: string;
	clientIP: string;
}): Promise<
	VerifyOTPResponse & { accessToken?: string; refreshToken?: string }
> {
	try {
		const email = normalizeEmail(request.email);

		if (!email || !validateEmail(email)) {
			return {
				success: false,
				message: "Invalid email address",
				error: "INVALID_EMAIL",
			};
		}

		if (!/^\d{6}$/.test(request.code)) {
			return {
				success: false,
				message: "Invalid verification code format",
				error: "INVALID_CODE_FORMAT",
			};
		}

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, 10, "15 m"),
			rateLimitByIP(request.clientIP, 50, "15 m"),
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

		const userId = await validateOTP(email, request.code);

		if (!userId) {
			return {
				success: false,
				message: "Invalid or expired verification code",
				error: "INVALID_CODE",
			};
		}

		const user = await getUserById(userId);

		if (!user) {
			return {
				success: false,
				message: "User not found",
				error: "USER_NOT_FOUND",
			};
		}

		if (!user.emailVerified) {
			await updateUser(userId, { emailVerified: true });
			user.emailVerified = true;
		}

		const accessToken = await generateAccessToken(user.id, user.email);
		const refreshToken = await generateRefreshToken(user.id);

		const refreshTokenExpiry = getTokenExpiry(
			process.env.JWT_REFRESH_EXPIRY || "30d",
		);
		await storeRefreshToken(refreshToken, user.id, refreshTokenExpiry);

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
