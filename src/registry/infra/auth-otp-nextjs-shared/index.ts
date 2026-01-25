// Core types
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
} from "./types";

// OTP utilities
export {
	generateOTP,
	getOTPExpiry,
	isOTPExpired,
	OTP_LENGTH,
	OTP_EXPIRY_MINUTES,
} from "./server/otp";

// Cookie utilities
export {
	setSessionTokenCookie,
	deleteSessionTokenCookie,
	getSessionTokenCookie,
} from "./server/cookies";

// Validation and utility functions
export { validateEmail, normalizeEmail, extractClientIP } from "./server/utils";

// Components
export { AuthForm } from "./components/auth-form";
export { LoginDialog } from "./components/login-dialog";

// Safe-action client
export { actionClient, authActionClient } from "./client/safe-action";
