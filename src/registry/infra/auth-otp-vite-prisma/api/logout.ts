import { validateSessionToken, invalidateSession } from "@/lib/server/auth/session";
import { serializeDeleteSessionCookie } from "@/lib/server/auth/cookie-utils";
import type { LogoutResponse } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
	try {
		const cookieHeader = request.headers.get("cookie") || "";
		const match = cookieHeader.match(/session=([^;]+)/);
		const token = match?.[1];

		if (token) {
			const { session } = await validateSessionToken(token);
			if (session) {
				await invalidateSession(session.id);
			}
		}

		return Response.json(
			{
				success: true,
				message: "Logged out successfully",
			} satisfies LogoutResponse,
			{
				status: 200,
				headers: {
					"Set-Cookie": serializeDeleteSessionCookie(),
				},
			},
		);
	} catch (error) {
		console.error("Error during logout:", error);
		// Still return success for logout to ensure client clears tokens
		return Response.json(
			{
				success: true,
				message: "Logged out successfully",
			} satisfies LogoutResponse,
			{ status: 200 },
		);
	}
}
