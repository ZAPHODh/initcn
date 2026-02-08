import { json } from "@tanstack/start";
import type { APIEvent } from "@tanstack/start";

function getClientIP(event: APIEvent): string {
	const forwarded = event.request.headers.get("x-forwarded-for");
	const realIP = event.request.headers.get("x-real-ip");
	return forwarded?.split(",")[0]?.trim() || realIP || "unknown";
}

export async function POST({ request }: APIEvent) {
	const clientIP = getClientIP({ request } as APIEvent);

	try {
		const body = await request.json();
		const { sendOTPHandler } = await import("@/lib/server/auth/api/send-otp");
		const result = await sendOTPHandler({
			email: body.email,
			clientIP,
		});
		return json(result, { status: result.success ? 200 : 400 });
	} catch (error) {
		console.error("[API] Send OTP error:", error);
		return json({ error: "Internal server error" }, { status: 500 });
	}
}
