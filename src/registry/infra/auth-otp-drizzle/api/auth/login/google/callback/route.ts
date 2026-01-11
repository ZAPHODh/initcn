import { google } from "@/lib/server/auth/server/google";
import { cookies } from "next/headers";
import {
	generateSessionToken,
	createSession,
	SESSION_COOKIE_NAME,
} from "@/lib/server/auth/server/session";
import { setSessionTokenCookie } from "@/lib/server/auth/server/cookies";
import { db } from "@/lib/server/auth/db";
import { users } from "@/lib/server/auth/schemas/drizzle.schema";
import { eq } from "drizzle-orm";
import { OAuth2RequestError, ArcticFetchError } from "arctic";

export async function GET(request: Request) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	const cookieStore = await cookies();
	const storedState = cookieStore.get("google_oauth_state")?.value;
	const storedCodeVerifier = cookieStore.get("google_code_verifier")?.value;

	if (
		!code ||
		!state ||
		!storedState ||
		!storedCodeVerifier ||
		state !== storedState
	) {
		return new Response(null, { status: 400 });
	}

	try {
		const tokens = await google.validateAuthorizationCode(
			code,
			storedCodeVerifier,
		);
		const googleUser = await fetch(
			"https://openidconnect.googleapis.com/v1/userinfo",
			{
				headers: { Authorization: `Bearer ${tokens.accessToken()}` },
			},
		).then((res) => res.json());

		let user = await db.query.users.findFirst({
			where: eq(users.email, googleUser.email),
		});

		if (!user) {
			const [newUser] = await db
				.insert(users)
				.values({
					email: googleUser.email,
					name: googleUser.name,
					picture: googleUser.picture,
					emailVerified: true,
				})
				.returning();
			user = newUser;
		}

		const sessionToken = generateSessionToken();
		await createSession(sessionToken, user.id);

		await setSessionTokenCookie(
			sessionToken,
			new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			SESSION_COOKIE_NAME,
		);

		cookieStore.delete("google_oauth_state");
		cookieStore.delete("google_code_verifier");

		return Response.redirect(new URL("/dashboard", request.url));
	} catch (e) {
		if (e instanceof OAuth2RequestError) {
			return new Response(null, { status: 400 });
		}
		if (e instanceof ArcticFetchError) {
			return new Response(null, { status: 500 });
		}
		console.error(e);
		return new Response(null, { status: 500 });
	}
}
