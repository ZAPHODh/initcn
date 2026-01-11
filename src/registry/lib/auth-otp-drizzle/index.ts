export { db } from "./db";
export { sendOTP } from "./mail";
export {
	rateLimitByEmail,
	rateLimitByIP,
	trackFailedAttempt,
	resetFailedAttempts,
} from "./rate-limit";

export {
	getCurrentSession,
	validateSessionToken,
	invalidateSession,
	invalidateAllUserSessions,
	generateSessionToken,
	createSession,
	createSessionId,
	getSessionExpiry,
	isSessionExpired,
	isSessionExpiringSoon,
	SESSION_EXPIRY_DAYS,
	SESSION_RENEWAL_THRESHOLD_DAYS,
	SESSION_COOKIE_NAME,
} from "./server/session";

export { logout } from "./actions/logout";

export { actionClient, authActionClient } from "./client/safe-action";

export {
	generateOTP,
	getOTPExpiry,
	isOTPExpired,
	OTP_LENGTH,
	OTP_EXPIRY_MINUTES,
	validateEmail,
	normalizeEmail,
	extractClientIP,
	setSessionTokenCookie,
	deleteSessionTokenCookie,
	getSessionTokenCookie,
	AuthForm,
	LoginDialog,
} from "@/lib/auth-otp-shared";

export type {
	User,
	Session,
	SessionWithUser,
	VerificationCode,
	SessionValidationResult,
	SendOTPRequest,
	SendOTPResponse,
	VerifyOTPRequest,
	VerifyOTPResponse,
} from "@/lib/server/auth/types";
