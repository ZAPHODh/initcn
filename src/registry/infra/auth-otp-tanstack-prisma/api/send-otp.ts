import { findOrCreateUser } from "../server/user";
import { generateAndStoreOTP } from "../server/verification";
import { sendOTP } from "../mail";
import { rateLimitByEmail, rateLimitByIP } from "../rate-limit";
import { normalizeEmail, validateEmail } from "@/lib/server/auth/server/utils";
import type { SendOTPRequest, SendOTPResponse } from "@/lib/server/auth/types";

/**
 * Send OTP handler (framework-agnostic)
 *
 * This function can be used with any backend framework (Hono, Express, Fastify, etc.)
 *
 * @example
 * ```typescript
 * // Hono
 * app.post('/api/auth/send-otp', async (c) => {
 *   const body = await c.req.json();
 *   const clientIP = c.req.header('x-forwarded-for') || 'unknown';
 *   const result = await sendOTPHandler({ email: body.email, clientIP });
 *   return c.json(result, result.success ? 200 : 400);
 * });
 *
 * // Express
 * app.post('/api/auth/send-otp', async (req, res) => {
 *   const clientIP = req.headers['x-forwarded-for'] || req.ip || 'unknown';
 *   const result = await sendOTPHandler({ email: req.body.email, clientIP });
 *   res.status(result.success ? 200 : 400).json(result);
 * });
 * ```
 */
export async function sendOTPHandler(request: {
	email: string;
	clientIP: string;
}): Promise<SendOTPResponse> {
	try {
		// 1. Validate and normalize email
		const email = normalizeEmail(request.email);

		if (!email || !validateEmail(email)) {
			return {
				success: false,
				message: "Invalid email address",
				error: "INVALID_EMAIL",
			};
		}

		// 2. Rate limiting - check both email and IP
		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, 3, "15 m"), // 3 requests per 15 minutes per email
			rateLimitByIP(request.clientIP, 20, "15 m"), // 20 requests per 15 minutes per IP
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

		// 3. Find or create user
		const user = await findOrCreateUser(email, { emailVerified: false });

		// 4. Generate and store OTP
		const code = await generateAndStoreOTP(user.id, email);

		// 5. Send email with OTP
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
