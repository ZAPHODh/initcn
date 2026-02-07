import { prisma } from "@/lib/server/auth/db";
import { sendOTP } from "@/lib/server/auth/mail";
import {
	rateLimitByEmail,
	rateLimitByIP,
} from "@/lib/server/auth/rate-limit";
import { normalizeEmail, validateEmail, extractClientIP } from "@/lib/server/utils";
import { generateOTP, getOTPExpiry } from "@/lib/server/otp";
import type { SendOTPRequest, SendOTPResponse } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
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

		const EMAIL_RATE_LIMIT = { requests: 3, window: "15 m" as const };
		const IP_RATE_LIMIT = { requests: 20, window: "15 m" as const };

		const [emailRateLimit, ipRateLimit] = await Promise.all([
			rateLimitByEmail(email, EMAIL_RATE_LIMIT.requests, EMAIL_RATE_LIMIT.window),
			rateLimitByIP(clientIP, IP_RATE_LIMIT.requests, IP_RATE_LIMIT.window),
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

		let user = await prisma.user.findUnique({ where: { email } });

		if (!user) {
			user = await prisma.user.create({
				data: {
					email,
					emailVerified: false,
				},
			});
		}

		// Delete existing codes
		await prisma.verificationCode.deleteMany({ where: { userId: user.id } });

		// Generate OTP
		const code = generateOTP(6);
		const expiresAt = getOTPExpiry(3);

		// Store OTP
		await prisma.verificationCode.create({
			data: { userId: user.id, email, code, expiresAt },
		});

		await sendOTP({
			to: email,
			code,
			userName: user.name ?? undefined,
		});

		return Response.json(
			{
				success: true,
				message: "OTP sent successfully",
			} satisfies SendOTPResponse,
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error sending OTP:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to send OTP",
			} satisfies SendOTPResponse,
			{ status: 500 },
		);
	}
}
