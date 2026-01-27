import { verifyRefreshToken } from "../server/session";
import { getUserById } from "../server/user";
import { generateAccessToken } from "@/lib/server/auth/server/jwt";
import type { RefreshTokenResponse } from "@/lib/server/auth/types";

/**
 * Refresh token handler (framework-agnostic)
 *
 * This function validates the refresh token and generates a new access token
 * The backend framework must read the refresh token from cookies
 *
 * @example
 * ```typescript
 * // Hono
 * import { getCookie, setCookie } from 'hono/cookie';
 *
 * app.post('/api/auth/refresh', async (c) => {
 *   const refreshToken = getCookie(c, 'refresh_token');
 *
 *   if (!refreshToken) {
 *     return c.json({ success: false, message: 'No refresh token' }, 401);
 *   }
 *
 *   const result = await refreshTokenHandler({ refreshToken });
 *
 *   if (result.success && result.accessToken) {
 *     // Set new access token cookie
 *     setCookie(c, 'access_token', result.accessToken, {
 *       httpOnly: true,
 *       secure: true,
 *       sameSite: 'lax',
 *       maxAge: 15 * 60, // 15 minutes
 *     });
 *
 *     // Remove token from response
 *     delete result.accessToken;
 *   }
 *
 *   return c.json(result, result.success ? 200 : 401);
 * });
 * ```
 */
export async function refreshTokenHandler(request: {
	refreshToken: string;
}): Promise<RefreshTokenResponse & { accessToken?: string }> {
	try {
		// 1. Validate refresh token
		const userId = await verifyRefreshToken(request.refreshToken);

		if (!userId) {
			return {
				success: false,
				message: "Invalid or expired refresh token",
				error: "INVALID_REFRESH_TOKEN",
			};
		}

		// 2. Get user
		const user = await getUserById(userId);

		if (!user) {
			return {
				success: false,
				message: "User not found",
				error: "USER_NOT_FOUND",
			};
		}

		// 3. Generate new access token
		const accessToken = await generateAccessToken(user.id, user.email);

		// 4. Return new access token
		// Backend framework should set this as httpOnly cookie
		return {
			success: true,
			message: "Token refreshed successfully",
			accessToken,
		};
	} catch (error) {
		console.error("Error refreshing token:", error);
		return {
			success: false,
			message: "Failed to refresh token",
			error: "INTERNAL_ERROR",
		};
	}
}
