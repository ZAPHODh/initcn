/**
 * OTP Configuration Constants
 */
export const OTP_CONFIG = {
	LENGTH: 6,
	EXPIRY_MINUTES: 10, // Increased from 3 (SEC-009 fix for better UX)
	COUNTDOWN_SECONDS: 30,
	MAX_FAILED_ATTEMPTS: 5, // Reduced from 10 for better security
	FAILED_ATTEMPTS_WINDOW_SECONDS: 3600, // 1 hour lockout
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMITS = {
	SEND_OTP_EMAIL: { requests: 3, window: "15 m" as const },
	SEND_OTP_IP: { requests: 20, window: "15 m" as const },
	VERIFY_OTP_EMAIL: { requests: 10, window: "15 m" as const },
	VERIFY_OTP_IP: { requests: 50, window: "15 m" as const },
} as const;
