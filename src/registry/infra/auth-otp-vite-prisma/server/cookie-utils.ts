export function serializeSessionCookie(token: string, expiresAt: Date): string {
	const isProduction = process.env.NODE_ENV === "production";
	let cookie = `session=${token}; HttpOnly; Path=/; SameSite=Lax`;
	cookie += `; Expires=${expiresAt.toUTCString()}`;
	if (isProduction) {
		cookie += "; Secure";
	}
	return cookie;
}

export function serializeDeleteSessionCookie(): string {
	return "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}
