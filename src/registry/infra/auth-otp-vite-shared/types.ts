// Core domain types - database-agnostic
export interface User {
	id: string;
	email: string;
	name: string | null;
	picture: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

export interface SessionWithUser extends Session {
	user: User;
}

export interface VerificationCode {
	id: string;
	userId: string;
	email: string;
	code: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface SessionValidationResult {
	session: Session | null;
	user: User | null;
}

// Request/Response types for API routes
export interface SendOTPRequest {
	email: string;
}

export interface SendOTPResponse {
	success: boolean;
	message: string;
	error?: string;
}

export interface VerifyOTPRequest {
	email: string;
	code: string;
}

export interface VerifyOTPResponse {
	success: boolean;
	message: string;
	error?: string;
}

export interface LogoutResponse {
	success: boolean;
	message: string;
}

export interface MeResponse {
	user?: User;
	error?: string;
}

// Rate limiting types
export interface RateLimitResult {
	success: boolean;
	limit: number;
	remaining: number;
	reset: number;
}
