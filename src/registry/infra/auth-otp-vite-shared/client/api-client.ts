let csrfToken: string | null = null;
let csrfSignature: string | null = null;


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
		credentials: "include", 
	});
}


export function clearCSRFTokens(): void {
	csrfToken = null;
	csrfSignature = null;
}
