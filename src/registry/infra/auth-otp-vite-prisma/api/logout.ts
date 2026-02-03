import {
	revokeRefreshToken,
	createTokenHash,
} from "@/lib/server/auth/session";
import { serializeDeleteCookie } from "@/lib/server/auth/cookie-utils";
import type { LogoutRequest, LogoutResponse } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as LogoutRequest;

		if (body.refreshToken) {
			const tokenHash = createTokenHash(body.refreshToken);
			await revokeRefreshToken(tokenHash);
		}

		// Delete auth cookies
		const deleteAccessToken = serializeDeleteCookie("access_token");
		const deleteRefreshToken = serializeDeleteCookie("refresh_token");

		return Response.json(
			{
				success: true,
				message: "Logged out successfully",
			} satisfies LogoutResponse,
			{
				status: 200,
				headers: {
					"Set-Cookie": [deleteAccessToken, deleteRefreshToken].join(", "),
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
