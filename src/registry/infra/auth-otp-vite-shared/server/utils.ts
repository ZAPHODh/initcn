// Improved email regex - more restrictive, prevents common exploits (SEC-004 fix)
export const EMAIL_REGEX =
	/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): boolean {
	// Length checks per RFC standards
	if (email.length > 254) return false;
	if (!EMAIL_REGEX.test(email)) return false;

	const [local, domain] = email.split("@");
	if (!local || !domain) return false;
	if (local.length > 64) return false; // RFC 5321
	if (domain.length > 253) return false; // RFC 1035

	return true;
}

// Trusted proxy IPs (from environment variable)
const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || "")
	.split(",")
	.filter(Boolean)
	.map((ip) => ip.trim());

/**
 * Extract client IP address from request headers with proxy validation.
 * Prevents IP spoofing by validating proxy chain (SEC-006 fix).
 */
export function extractClientIP(request: Request): string {
	// Development: trust first IP without validation
	if (process.env.NODE_ENV === "development") {
		const forwardedFor = request.headers.get("x-forwarded-for");
		if (forwardedFor) {
			return forwardedFor.split(",")[0].trim();
		}
		return "unknown";
	}

	// Production: validate proxy chain
	const forwardedFor = request.headers.get("x-forwarded-for");

	if (forwardedFor && TRUSTED_PROXIES.length > 0) {
		const ips = forwardedFor.split(",").map((ip) => ip.trim());

		// Use rightmost non-trusted IP (first client IP before our proxies)
		// This prevents clients from spoofing the header
		for (let i = ips.length - 1; i >= 0; i--) {
			const ip = ips[i];
			if (!TRUSTED_PROXIES.includes(ip)) {
				return ip;
			}
		}
	}

	// Fallback to x-real-ip (single proxy scenario)
	const realIp = request.headers.get("x-real-ip");
	if (realIp && TRUSTED_PROXIES.length > 0) {
		return realIp.trim();
	}

	// No valid proxy headers or untrusted environment
	return "unknown";
}

export function normalizeEmail(email: string): string {
	return email.toLowerCase().trim();
}
