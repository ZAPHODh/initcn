import { ArcticFetchError, OAuth2RequestError } from "arctic";
import { serializeSessionCookie } from "@/lib/server/auth/cookie-utils";
import { google } from "@/lib/server/auth/google";
import {
  createSession,
  generateSessionToken,
  getSessionExpiry,
} from "@/lib/server/auth/session";
import { prisma } from "@/lib/server/db";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("cookie") || "";
  const storedState = cookieHeader.match(/google_oauth_state=([^;]+)/)?.[1];
  const storedCodeVerifier = cookieHeader.match(
    /google_code_verifier=([^;]+)/,
  )?.[1];

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

    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          emailVerified: true,
        },
      });
    }

    const sessionToken = generateSessionToken();
    await createSession(sessionToken, user.id);
    const sessionExpiry = getSessionExpiry();
    const sessionCookie = serializeSessionCookie(sessionToken, sessionExpiry);

    const headers = new Headers();
    headers.set("Location", "/dashboard");
    headers.append("Set-Cookie", sessionCookie);
    headers.append(
      "Set-Cookie",
      "google_oauth_state=; Path=/; HttpOnly; Max-Age=0",
    );
    headers.append(
      "Set-Cookie",
      "google_code_verifier=; Path=/; HttpOnly; Max-Age=0",
    );

    return new Response(null, { status: 302, headers });
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
