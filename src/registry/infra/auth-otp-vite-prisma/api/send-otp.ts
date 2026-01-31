import { findOrCreateUser } from "@/lib/server/auth/user";
import { generateAndStoreOTP } from "@/lib/server/auth/verification";
import { sendOTP } from "@/lib/server/auth/mail";
import { rateLimitByEmail, rateLimitByIP } from "@/lib/server/auth/rate-limit";
import { normalizeEmail, validateEmail } from "@/lib/server/utils";
import type { SendOTPRequest, SendOTPResponse } from "@/lib/types";

export async function sendOTPHandler(request: {
	email: string;
	clientIP: string;
}): Promise<SendOTPResponse> {
	try {
		const email = normalizeEmail(request.email);

		if (!email || !validateEmail(email)) {
			return {
				success: false,
				message: "Invalid email address",
				error: "INVALID_EMAIL",
			};
		}

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, 3, "15 m"),
			rateLimitByIP(request.clientIP, 20, "15 m"),
		]);

		if (!emailRateLimit.success) {
			return {
				success: false,
				message: "Too many requests. Please try again later.",
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
				message: "Too many requests from this IP. Please try again later.",
				error: "RATE_LIMIT_EXCEEDED",
				rateLimit: {
					limit: ipRateLimit.limit,
					remaining: ipRateLimit.remaining,
					reset: ipRateLimit.reset,
				},
			};
		}

		const userPromise = findOrCreateUser(email, { emailVerified: false });
		const otpPromise = userPromise.then((user) =>
			generateAndStoreOTP(user.id, email),
		);

		const [user, code] = await Promise.all([userPromise, otpPromise]);

		await sendOTP({
			to: email,
			code,
			userName: user.name ?? undefined,
		});

		return {
			success: true,
			message: "Verification code sent to your email",
			rateLimit: {
				limit: emailRateLimit.limit,
				remaining: emailRateLimit.remaining,
				reset: emailRateLimit.reset,
			},
		};
	} catch (error) {
		console.error("Error sending OTP:", error);
		return {
			success: false,
			message: "Failed to send verification code",
			error: "INTERNAL_ERROR",
		};
	}
}
