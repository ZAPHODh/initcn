import { findOrCreateUser } from "@/lib/server/auth/user";
import { generateAndStoreOTP } from "@/lib/server/auth/verification";
import { sendOTP } from "@/lib/server/auth/mail";
import {
	rateLimitByEmail,
	rateLimitByIP,
} from "@/lib/server/auth/rate-limit";
import { normalizeEmail, validateEmail, extractClientIP } from "@/lib/server/utils";
import { validateCSRFFromRequest } from "@/lib/server/auth/csrf";
import { RATE_LIMITS } from "@/lib/constants/auth";
import type { SendOTPRequest, SendOTPResponse } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
	// CSRF validation (SEC-002 fix)
	if (!validateCSRFFromRequest(request)) {
		return Response.json(
			{
				success: false,
				message: "Invalid CSRF token",
			} satisfies SendOTPResponse,
			{ status: 403 },
		);
	}

	try {
		const body = (await request.json()) as SendOTPRequest;
		const email = normalizeEmail(body.email);

		if (!email || !validateEmail(email)) {
			return Response.json(
				{
					success: false,
					message: "Invalid email address",
				} satisfies SendOTPResponse,
				{ status: 400 },
			);
		}

		const clientIP = extractClientIP(request);

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, RATE_LIMITS.SEND_OTP_EMAIL.requests, RATE_LIMITS.SEND_OTP_EMAIL.window),
			rateLimitByIP(clientIP, RATE_LIMITS.SEND_OTP_IP.requests, RATE_LIMITS.SEND_OTP_IP.window),
		]);

		if (!emailRateLimit.success) {
			console.warn(`Rate limit exceeded for send-otp: email=${email}`);
			return Response.json(
				{
					success: false,
					message: "Too many OTP requests. Please try again later.",
				} satisfies SendOTPResponse,
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
			console.warn(`Rate limit exceeded for send-otp: ip=${clientIP}`);
			return Response.json(
				{
					success: false,
					message: "Too many requests from your IP. Please try again later.",
				} satisfies SendOTPResponse,
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

		return Response.json(
			{
				success: true,
				message: "Verification code sent to your email",
			} satisfies SendOTPResponse,
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error sending OTP:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to send verification code",
			} satisfies SendOTPResponse,
			{ status: 500 },
		);
	}
}
