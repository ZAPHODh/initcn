import { verifyAccessToken } from "@/lib/server/auth/session";
import type { MeResponse } from "@/lib/types";

export async function meHandler(request: {
	accessToken: string;
}): Promise<MeResponse> {
	try {
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
