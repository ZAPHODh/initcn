import { verifyRefreshToken } from "@/lib/server/auth/session";
import { getUserById } from "@/lib/server/auth/user";
import { generateAccessToken } from "@/lib/server/jwt";
import type { RefreshTokenResponse } from "@/lib/types";

export async function refreshTokenHandler(request: {
	refreshToken: string;
}): Promise<RefreshTokenResponse & { accessToken?: string }> {
	try {
		const userId = await verifyRefreshToken(request.refreshToken);

		if (!userId) {
			return {
				success: false,
				message: "Invalid or expired refresh token",
				error: "INVALID_REFRESH_TOKEN",
			};
		}

		const user = await getUserById(userId);

		if (!user) {
			return {
				success: false,
				message: "User not found",
				error: "USER_NOT_FOUND",
			};
		}

		const accessToken = await generateAccessToken(user.id, user.email);

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
