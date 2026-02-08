import { validateSessionToken } from "@/lib/server/auth/session";
import type { MeResponse } from "@/lib/types";

function getTokenFromRequest(request: Request): string | null {
	const cookies = request.headers.get("cookie") || "";
	const match = cookies.match(/session=([^;]+)/);
	return match?.[1] ?? null;
}

export async function GET(request: Request): Promise<Response> {
	try {
		const token = getTokenFromRequest(request);

		if (!token) {
			return Response.json(
				{
					error: "Not authenticated",
				} satisfies MeResponse,
				{ status: 401 },
			);
		}

		const { user } = await validateSessionToken(token);

		if (!user) {
			return Response.json(
				{
					error: "Invalid or expired session",
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
