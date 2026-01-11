/**
 * Session cookie management
 *
 * Utilities for setting and deleting session cookies
 */

import { cookies } from "next/headers";

/**
 * Set session token cookie
 *
 * @param token - Session token
 * @param expiresAt - Expiration date
 * @param cookieName - Cookie name (default: "session")
 */
export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date,
  cookieName: string = "session",
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Delete session token cookie
 *
 * @param cookieName - Cookie name (default: "session")
 */
export async function deleteSessionTokenCookie(
  cookieName: string = "session",
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Get session token from cookie
 *
 * @param cookieName - Cookie name (default: "session")
 * @returns Session token or null
 */
export async function getSessionTokenCookie(
  cookieName: string = "session",
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(cookieName);
  return cookie?.value ?? null;
}
