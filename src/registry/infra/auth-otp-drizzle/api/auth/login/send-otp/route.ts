import { db } from "@/lib/server/auth/db";
import { users, verificationCodes } from "@/lib/server/auth/schemas/drizzle.schema";
import { sendOTP } from "@/lib/server/auth/mail";
import {
	rateLimitByEmail,
	rateLimitByIP,
} from "@/lib/server/auth/rate-limit";
import { generateOTP, getOTPExpiry } from "@/lib/server/auth/server/otp";
import {
	validateEmail,
	extractClientIP,
	normalizeEmail,
} from "@/lib/server/auth/server/utils";
import type {
	SendOTPRequest,
	SendOTPResponse,
} from "@/lib/server/auth/types";
import { eq } from "drizzle-orm";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 3;
const EMAIL_RATE_LIMIT = { requests: 3, window: "15 m" as const };
const IP_RATE_LIMIT = { requests: 20, window: "15 m" as const };

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

		let user = await db.query.users.findFirst({
			where: eq(users.email, email),
		});

		if (!user) {
			const [newUser] = await db
				.insert(users)
				.values({
					email,
					emailVerified: false,
				})
				.returning();
			user = newUser;
		}

		await db.delete(verificationCodes).where(eq(verificationCodes.userId, user.id));

		const code = generateOTP(OTP_LENGTH);
		const expiresAt = getOTPExpiry(OTP_EXPIRY_MINUTES);

		await db.insert(verificationCodes).values({
			userId: user.id,
			email,
			code,
			expiresAt,
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
		console.error("Send OTP error:", error);
		return Response.json(
			{
				success: false,
				message: "Internal server error",
			} satisfies SendOTPResponse,
			{ status: 500 },
		);
	}
}
