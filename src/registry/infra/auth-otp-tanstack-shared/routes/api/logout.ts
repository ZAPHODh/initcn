import { json } from "@tanstack/start";
import type { APIEvent } from "@tanstack/start";

function getCookieValue(request: Request, name: string): string | null {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";").map((c) => c.trim());
	const cookie = cookies.find((c) => c.startsWith(`${name}=`));

	return cookie ? cookie.split("=")[1] : null;
}

export async function POST({ request }: APIEvent) {
	try {
		const { logoutHandler } = await import("@/lib/server/auth/api/logout");
		const sessionToken = getCookieValue(request, "session");

		const result = await logoutHandler({ sessionToken: sessionToken || "" });

		const headers = new Headers();
		headers.set(
			"Set-Cookie",
			"session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
		);

		return json(result, { status: 200, headers });
	} catch (error) {
		console.error("[API] Logout error:", error);
		return json({ error: "Internal server error" }, { status: 500 });
	}
}
