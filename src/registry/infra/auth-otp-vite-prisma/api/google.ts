import { generateCodeVerifier, generateState } from "arctic";
import { google } from "@/lib/server/auth/server/google";

export async function GET(_request: Request): Promise<Response> {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	const url = google.createAuthorizationURL(state, codeVerifier, [
		"openid",
		"profile",
		"email",
	]);

	url.searchParams.set("access_type", "offline");

	const isProduction = process.env.NODE_ENV === "production";
	const cookieOpts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isProduction ? "; Secure" : ""}`;

	const headers = new Headers();
	headers.set("Location", url.toString());
	headers.append("Set-Cookie", `google_oauth_state=${state}; ${cookieOpts}`);
	headers.append("Set-Cookie", `google_code_verifier=${codeVerifier}; ${cookieOpts}`);

	return new Response(null, { status: 302, headers });
}
