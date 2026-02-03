let csrfToken: string | null = null;
let csrfSignature: string | null = null;

/**
 * Refresh CSRF tokens from the server.
 */
export async function refreshCSRFToken(): Promise<void> {
	try {
		const response = await fetch("/api/auth/csrf");
		if (!response.ok) {
			throw new Error("Failed to fetch CSRF token");
		}

		const data = await response.json();
		csrfToken = data.token;
		csrfSignature = data.signature;
	} catch (error) {
		console.error("Error refreshing CSRF token:", error);
		throw error;
	}
}

/**
 * Fetch wrapper that automatically includes CSRF tokens.
 * Use this for all authenticated API requests.
 */
export async function authenticatedFetch(
	url: string,
	options: RequestInit = {},
): Promise<Response> {
	// Refresh CSRF token if not available
	if (!csrfToken || !csrfSignature) {
		await refreshCSRFToken();
	}

	return fetch(url, {
		...options,
		headers: {
			...options.headers,
			"X-CSRF-Token": csrfToken!,
			"X-CSRF-Signature": csrfSignature!,
		},
		credentials: "include", // Include cookies
	});
}

/**
 * Clear cached CSRF tokens (call on logout or CSRF error).
 */
export function clearCSRFTokens(): void {
	csrfToken = null;
	csrfSignature = null;
}
