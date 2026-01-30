import { verifyAccessToken } from "@/lib/server/auth/session";
import type { MeResponse } from "@/lib/server/auth/types";

/**
 * Get current user handler (framework-agnostic)
 *
 * This function validates the access token and returns the current user
 * The backend framework must read the access token from cookies
 *
 * @example
 * ```typescript
 * // Hono
 * import { getCookie } from 'hono/cookie';
 *
 * app.get('/api/auth/me', async (c) => {
 *   const accessToken = getCookie(c, 'access_token');
 *
 *   if (!accessToken) {
 *     return c.json({ error: 'Not authenticated' }, 401);
 *   }
 *
 *   const result = await meHandler({ accessToken });
 *
 *   if (!result.user) {
 *     return c.json({ error: result.error || 'Not authenticated' }, 401);
 *   }
 *
 *   return c.json({ user: result.user });
 * });
 * ```
 */
export async function meHandler(request: {
	accessToken: string;
}): Promise<MeResponse> {
	try {
		// Validate access token and get user
		const user = await verifyAccessToken(request.accessToken);

		if (!user) {
			return {
				error: "Invalid or expired access token",
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
