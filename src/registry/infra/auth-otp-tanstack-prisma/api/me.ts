import { validateSessionToken } from "@/lib/server/auth/session";
import type { MeResponse } from "@/lib/server/auth/types";

/**
 * Get current user handler (framework-agnostic)
 *
 * This function validates the session token and returns the current user
 * The backend framework must read the session token from cookies
 *
 * @example
 * ```typescript
 * // TanStack Start route
 * export async function GET({ request }: APIEvent) {
 *   const sessionToken = getCookieValue(request, "session");
 *
 *   if (!sessionToken) {
 *     return json({ error: "Not authenticated" }, { status: 401 });
 *   }
 *
 *   const result = await meHandler({ sessionToken });
 *   return json(result, { status: result.user ? 200 : 401 });
 * }
 * ```
 */
export async function meHandler(request: {
	sessionToken: string;
}): Promise<MeResponse> {
	try {
		const { user } = await validateSessionToken(request.sessionToken);

		if (!user) {
			return {
				error: "Invalid or expired session",
			};
		}

		return {
			user,
		};
	} catch (error) {
		console.error("Error getting current user:", error);
		return {
			error: "Failed to get user information",
		};
	}
}
