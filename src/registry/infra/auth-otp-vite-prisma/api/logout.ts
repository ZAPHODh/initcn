import { revokeRefreshToken, createTokenHash } from "../server/session";
import type { LogoutResponse } from "@/lib/types";

export async function logoutHandler(request: {
	refreshToken?: string;
}): Promise<LogoutResponse> {
	try {
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
		return {
			success: true,
			message: "Logged out successfully",
		};
	}
}
