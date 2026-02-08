import { json } from "@tanstack/start";
import type { APIEvent } from "@tanstack/start";

function getCookieValue(request: Request, name: string): string | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";").map((c) => c.trim());
	const cookie = cookies.find((c) => c.startsWith(`${name}=`));

	return cookie ? cookie.split("=")[1] : null;
}

export async function GET({ request }: APIEvent) {
	try {
		const { meHandler } = await import("@/lib/server/auth/api/me");
		const sessionToken = getCookieValue(request, "session");

		if (!sessionToken) {
			return json({ error: "Not authenticated" }, { status: 401 });
		}

		const result = await meHandler({ sessionToken });
		return json(result, { status: result.user ? 200 : 401 });
	} catch (error) {
		console.error("[API] Me endpoint error:", error);
		return json({ error: "Internal server error" }, { status: 500 });
	}
}
