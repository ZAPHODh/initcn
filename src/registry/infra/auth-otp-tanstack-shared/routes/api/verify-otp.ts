import { json } from "@tanstack/start";
import type { APIEvent } from "@tanstack/start";

const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getClientIP(event: APIEvent): string {
	const forwarded = event.request.headers.get("x-forwarded-for");
	const realIP = event.request.headers.get("x-real-ip");
	return forwarded?.split(",")[0]?.trim() || realIP || "unknown";
}

export async function POST({ request }: APIEvent) {
	const clientIP = getClientIP({ request } as APIEvent);

	try {
		const body = await request.json();
		const { verifyOTPHandler } = await import(
			"@/lib/server/auth/api/verify-otp"
		);
		const result = await verifyOTPHandler({
			email: body.email,
			code: body.code,
			clientIP,
		});

		if (result.success && result.sessionToken) {
			const headers = new Headers();
			headers.set(
				"Set-Cookie",
				`session=${result.sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}`,
			);

			// Don't expose the token in the response body
			const { sessionToken: _, ...responseBody } = result;
			return json(responseBody, { status: 200, headers });
		}

		return json(result, { status: result.success ? 200 : 400 });
	} catch (error) {
		console.error("[API] Verify OTP error:", error);
		return json({ error: "Internal server error" }, { status: 500 });
	}
}
