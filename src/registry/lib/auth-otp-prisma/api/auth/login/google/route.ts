import { generateCodeVerifier, generateState } from "arctic";
import { google } from "@/lib/auth-otp-prisma/server/google";
import { cookies } from "next/headers";

export async function GET() {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();

	const url = google.createAuthorizationURL(state, codeVerifier, [
		"openid",
		"profile",
		"email",
	]);

	url.searchParams.set("access_type", "offline");

	const cookieStore = await cookies();
	cookieStore.set("google_oauth_state", state, {
		path: "/",
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 10, // 10 minutes
		sameSite: "lax",
	});

	cookieStore.set("google_code_verifier", codeVerifier, {
		path: "/",
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 10,
		sameSite: "lax",
	});

	return Response.redirect(url);
}
