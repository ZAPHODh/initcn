import { verifyAccessToken } from "@/lib/server/auth/session";
import type { MeResponse } from "@/lib/types";

function getTokenFromRequest(request: Request): string | null {
	// Try Authorization header first
	const authHeader = request.headers.get("authorization");
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.substring(7);
	}

	// Try cookie
	const cookies = request.headers.get("cookie");
	if (cookies) {
		const match = cookies.match(/access_token=([^;]+)/);
		if (match) {
			return match[1];
		}
	}

	return null;
}

export async function GET(request: Request): Promise<Response> {
	try {
		const accessToken = getTokenFromRequest(request);

		if (!accessToken) {
			return Response.json(
				{
					error: "Access token not provided",
				} satisfies MeResponse,
				{ status: 401 },
			);
		}

		const user = await verifyAccessToken(accessToken);

		if (!user) {
			return Response.json(
				{
					error: "Invalid or expired access token",
				} satisfies MeResponse,
				{ status: 401 },
			);
		}

		return Response.json(
			{
				user,
			} satisfies MeResponse,
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error getting current user:", error);
		return Response.json(
			{
				error: "Failed to get user information",
			} satisfies MeResponse,
			{ status: 500 },
		);
	}
}
