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

// JWT payload interface (follows standard JWT claims)
export interface JWTPayload {
	sub: string; // userId (standard JWT claim)
	email: string;
	exp: number; // Expiration timestamp (Unix timestamp)
	iat: number; // Issued at timestamp (Unix timestamp)
	type: "access" | "refresh";
}

// Refresh token database model (for revocation tracking)
export interface RefreshToken {
	id: string;
	userId: string;
	tokenHash: string; // SHA256 hash of the refresh token
	expiresAt: Date;
	revoked: boolean;
	createdAt: Date;
}

export interface VerificationCode {
	id: string;
	userId: string;
	email: string;
	code: string;
	expiresAt: Date;
	createdAt: Date;
}

// Auth validation result (for TanStack Query)
export interface AuthValidationResult {
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
	rateLimit?: {
		limit: number;
		remaining: number;
		reset: number;
	};
}

export interface VerifyOTPRequest {
	email: string;
	code: string;
}

export interface VerifyOTPResponse {
	success: boolean;
	message: string;
	user?: User;
	error?: string;
	rateLimit?: {
		limit: number;
		remaining: number;
		reset: number;
	};
}

export interface RefreshTokenResponse {
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
