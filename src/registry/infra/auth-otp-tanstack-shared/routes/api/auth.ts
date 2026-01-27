/**
 * TanStack Start API Routes for Authentication
 *
 * These routes wrap the framework-agnostic handler functions from the Prisma tier.
 * They provide a unified API for auth operations using TanStack Start's server route pattern.
 */

import { json } from "@tanstack/start";
import type { APIEvent } from "@tanstack/start";

/**
 * Helper to get client IP from request headers
 */
function getClientIP(event: APIEvent): string {
	const forwarded = event.request.headers.get("x-forwarded-for");
	const realIP = event.request.headers.get("x-real-ip");
	return forwarded?.split(",")[0]?.trim() || realIP || "unknown";
}

/**
 * POST /api/auth
 *
 * Handles multiple auth actions based on query parameter:
 * - ?action=send-otp - Send OTP to email
 * - ?action=verify-otp - Verify OTP and create session
 * - ?action=logout - Logout user
 * - ?action=refresh - Refresh access token
 */
export async function POST({ request }: APIEvent) {
	const url = new URL(request.url);
	const action = url.searchParams.get("action");
	const clientIP = getClientIP({ request } as APIEvent);

	try {
		const body = await request.json();

		switch (action) {
			case "send-otp": {
				// Import handler from Prisma tier
				const { sendOTPHandler } = await import(
					"@/lib/server/auth/api/send-otp"
				);
				const result = await sendOTPHandler({
					email: body.email,
					clientIP,
				});
				return json(result, { status: result.success ? 200 : 400 });
			}

			case "verify-otp": {
				const { verifyOTPHandler } = await import(
					"@/lib/server/auth/api/verify-otp"
				);
				const result = await verifyOTPHandler({
					email: body.email,
					code: body.code,
					clientIP,
				});

				// Set cookies for JWT tokens
				if (result.success && result.accessToken && result.refreshToken) {
					const headers = new Headers();
					headers.append(
						"Set-Cookie",
						`access_token=${result.accessToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${15 * 60}`,
					); // 15 min
					headers.append(
						"Set-Cookie",
						`refresh_token=${result.refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
					); // 30 days

					return json(result, { status: 200, headers });
				}

				return json(result, { status: result.success ? 200 : 400 });
			}

			case "logout": {
				const { logoutHandler } = await import("@/lib/server/auth/api/logout");
				const refreshToken = getCookieValue(request, "refresh_token");

				const result = await logoutHandler({ refreshToken: refreshToken || "" });

				// Clear cookies
				const headers = new Headers();
				headers.append(
					"Set-Cookie",
					"access_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
				);
				headers.append(
					"Set-Cookie",
					"refresh_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
				);

				return json(result, { status: 200, headers });
			}

			case "refresh": {
				const { refreshTokenHandler } = await import(
					"@/lib/server/auth/api/refresh-token"
				);
				const refreshToken = getCookieValue(request, "refresh_token");

				const result = await refreshTokenHandler({
					refreshToken: refreshToken || "",
				});

				// Set new access token cookie
				if (result.success && result.accessToken) {
					const headers = new Headers();
					headers.append(
						"Set-Cookie",
						`access_token=${result.accessToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${15 * 60}`,
					);

					return json(result, { status: 200, headers });
				}

				return json(result, { status: result.success ? 200 : 400 });
			}

			default:
				return json({ error: "Invalid action" }, { status: 400 });
		}
	} catch (error) {
		console.error("[API] Auth error:", error);
		return json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * GET /api/auth/me
 *
 * Get current authenticated user
 */
export async function GET({ request }: APIEvent) {
	try {
		const { meHandler } = await import("@/lib/server/auth/api/me");
		const accessToken = getCookieValue(request, "access_token");

		const result = await meHandler({ accessToken: accessToken || "" });
		return json(result, { status: result.success ? 200 : 401 });
	} catch (error) {
		console.error("[API] Me endpoint error:", error);
		return json(
			{ success: false, message: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * Helper to extract cookie value from request
 */
function getCookieValue(request: Request, name: string): string | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";").map((c) => c.trim());
	const cookie = cookies.find((c) => c.startsWith(`${name}=`));

	return cookie ? cookie.split("=")[1] : null;
}
