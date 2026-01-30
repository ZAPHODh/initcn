import { revokeRefreshToken, createTokenHash } from "@/lib/server/auth/session";
import type { LogoutResponse } from "@/lib/server/auth/types";

/**
 * Logout handler (framework-agnostic)
 *
 * This function revokes the refresh token
 * The backend framework must clear the cookies
 *
 * @example
 * ```typescript
 * // Hono
 * import { getCookie, deleteCookie } from 'hono/cookie';
 *
 * app.post('/api/auth/logout', async (c) => {
 *   const refreshToken = getCookie(c, 'refresh_token');
 *
 *   if (refreshToken) {
 *     await logoutHandler({ refreshToken });
 *   }
 *
 *   // Clear cookies
 *   deleteCookie(c, 'access_token');
 *   deleteCookie(c, 'refresh_token');
 *
 *   return c.json({ success: true, message: 'Logged out successfully' });
 * });
 * ```
 */
export async function logoutHandler(request: {
	refreshToken?: string;
}): Promise<LogoutResponse> {
	try {
		// If refresh token exists, revoke it
		if (request.refreshToken) {
			const tokenHash = createTokenHash(request.refreshToken);
			await revokeRefreshToken(tokenHash);
		}

		return {
			success: true,
			message: "Logged out successfully",
		};
	} catch (error) {
		console.error("Error during logout:", error);
		// Always return success for logout (even if revocation fails)
		return {
			success: true,
			message: "Logged out successfully",
		};
	}
}
