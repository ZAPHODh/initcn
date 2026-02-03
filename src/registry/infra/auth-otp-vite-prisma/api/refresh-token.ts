import { verifyRefreshToken } from "@/lib/server/auth/session";
import { getUserById } from "@/lib/server/auth/user";
import { generateAccessToken } from "@/lib/server/jwt";
import { serializeSecureCookie } from "@/lib/server/auth/cookie-utils";
import { TOKEN_CONFIG } from "@/lib/constants/auth";
import type { RefreshTokenRequest, RefreshTokenResponse } from "@/lib/types";

function getRefreshTokenFromRequest(request: Request): string | null {
	// Try cookie first
	const cookies = request.headers.get("cookie");
	if (cookies) {
		const match = cookies.match(/refresh_token=([^;]+)/);
		if (match) {
			return match[1];
		}
	}

	return null;
}

export async function POST(request: Request): Promise<Response> {
	try {
		let refreshToken: string | null = null;

		// Try to get refresh token from cookie first
		refreshToken = getRefreshTokenFromRequest(request);

		// If not in cookie, try request body
		if (!refreshToken) {
			const body = (await request.json()) as RefreshTokenRequest;
			refreshToken = body.refreshToken;
		}

		if (!refreshToken) {
			return Response.json(
				{
					success: false,
					message: "Refresh token not provided",
				} satisfies RefreshTokenResponse,
				{ status: 401 },
			);
		}

		const userId = await verifyRefreshToken(refreshToken);

		if (!userId) {
			return Response.json(
				{
					success: false,
					message: "Invalid or expired refresh token",
				} satisfies RefreshTokenResponse,
				{ status: 401 },
			);
		}

		const user = await getUserById(userId);

		if (!user) {
			return Response.json(
				{
					success: false,
					message: "User not found",
				} satisfies RefreshTokenResponse,
				{ status: 404 },
			);
		}

		const accessToken = await generateAccessToken(user.id, user.email);

		// Set new access token cookie
		const accessTokenCookie = serializeSecureCookie(
			"access_token",
			accessToken,
			TOKEN_CONFIG.ACCESS_TOKEN_MAX_AGE,
		);

		return Response.json(
			{
				success: true,
				message: "Token refreshed successfully",
			} satisfies RefreshTokenResponse,
			{
				status: 200,
				headers: {
					"Set-Cookie": accessTokenCookie,
				},
			},
		);
	} catch (error) {
		console.error("Error refreshing token:", error);
		return Response.json(
			{
				success: false,
				message: "Failed to refresh token",
			} satisfies RefreshTokenResponse,
			{ status: 500 },
		);
	}
}
