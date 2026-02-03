export function serializeSecureCookie(
	name: string,
	value: string,
	maxAge: number,
): string {
	const isProduction = process.env.NODE_ENV === "production";

	let cookie = `${name}=${value}`;
	cookie += "; HttpOnly"; // Prevents XSS
	cookie += "; Path=/";
	cookie += "; SameSite=Lax"; // CSRF protection
	cookie += `; Max-Age=${maxAge}`;

	if (isProduction) {
		cookie += "; Secure"; // HTTPS only in production
	}

	return cookie;
}

export function serializeDeleteCookie(name: string): string {
	return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
