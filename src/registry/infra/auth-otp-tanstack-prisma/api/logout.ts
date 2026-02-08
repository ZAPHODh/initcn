import {
	validateSessionToken,
	invalidateSession,
} from "@/lib/server/auth/session";
import type { LogoutResponse } from "@/lib/server/auth/types";

/**
 * Logout handler (framework-agnostic)
 *
 * This function invalidates the session
 * The backend framework must clear the session cookie
 *
 * @example
 * ```typescript
 * // TanStack Start route
 * case "logout": {
 *   const sessionToken = getCookieValue(request, "session");
 *   const result = await logoutHandler({ sessionToken: sessionToken || "" });
 *
 *   const headers = new Headers();
 *   headers.set("Set-Cookie", "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
 *   return json(result, { status: 200, headers });
 * }
 * ```
 */
export async function logoutHandler(request: {
	sessionToken?: string;
}): Promise<LogoutResponse> {
	try {
		if (request.sessionToken) {
			const { session } = await validateSessionToken(request.sessionToken);
			if (session) {
				await invalidateSession(session.id);
			}
		}

		return {
			success: true,
			message: "Logged out successfully",
		};
	} catch (error) {
		console.error("Error during logout:", error);
		// Always return success for logout (even if invalidation fails)
		return {
			success: true,
			message: "Logged out successfully",
		};
	}
}
