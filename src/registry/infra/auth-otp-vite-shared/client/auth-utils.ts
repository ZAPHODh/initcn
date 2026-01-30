import { decodeJWTUnsafe } from "@/lib/server/auth/jwt";
import type { JWTPayload } from "@/lib/server/auth/types";

/**
 * Fetch wrapper with automatic token refresh
 *
 * This function automatically retries failed requests with a 401 status
 * by attempting to refresh the access token and retrying the original request
 *
 * @example
 * ```tsx
 * const data = await fetchWithAuth('/api/protected-resource');
 * ```
 */
export async function fetchWithAuth(
	url: string,
	options?: RequestInit,
): Promise<Response> {
	// Initial request
	let response = await fetch(url, {
		...options,
		credentials: "include", // Always send cookies
	});

	// If unauthorized, try to refresh token and retry
	if (response.status === 401) {
		const refreshed = await refreshAccessToken();

		if (refreshed) {
			// Retry the original request with new access token
			response = await fetch(url, {
				...options,
				credentials: "include",
			});
		}
	}

	return response;
}

/**
 * Refresh the access token using the refresh token
 *
 * @returns true if refresh was successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
	try {
		const response = await fetch("/api/auth/refresh", {
			method: "POST",
			credentials: "include",
		});

		return response.ok;
	} catch (error) {
		console.error("Failed to refresh access token:", error);
		return false;
	}
}

/**
 * Decode a JWT token (client-side, unsafe)
 *
 * WARNING: This does NOT verify the token signature.
 * Only use this for reading non-sensitive data on the client side.
 * Never trust this data for authentication decisions.
 *
 * @example
 * ```tsx
 * // Read user email from token for display purposes only
 * const payload = decodeJWT(token);
 * if (payload) {
 *   console.log('User email:', payload.email);
 * }
 * ```
 */
export function decodeJWT(token: string): JWTPayload | null {
	return decodeJWTUnsafe(token);
}

/**
 * Check if a JWT token is expired
 *
 * @param token - The JWT token to check
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
	const payload = decodeJWTUnsafe(token);
	if (!payload || !payload.exp) {
		return true;
	}

	// exp is in seconds, Date.now() is in milliseconds
	return payload.exp * 1000 < Date.now();
}

/**
 * Get the time until a token expires
 *
 * @param token - The JWT token to check
 * @returns milliseconds until expiry, or 0 if already expired
 */
export function getTokenTimeToExpiry(token: string): number {
	const payload = decodeJWTUnsafe(token);
	if (!payload || !payload.exp) {
		return 0;
	}

	const expiryMs = payload.exp * 1000;
	const timeToExpiry = expiryMs - Date.now();

	return Math.max(0, timeToExpiry);
}

/**
 * Format time remaining in a human-readable format
 *
 * @param milliseconds - Time in milliseconds
 * @returns Formatted string (e.g., "5 minutes", "30 seconds")
 */
export function formatTimeRemaining(milliseconds: number): string {
	if (milliseconds <= 0) {
		return "Expired";
	}

	const seconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days} day${days > 1 ? "s" : ""}`;
	}
	if (hours > 0) {
		return `${hours} hour${hours > 1 ? "s" : ""}`;
	}
	if (minutes > 0) {
		return `${minutes} minute${minutes > 1 ? "s" : ""}`;
	}
	return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}
