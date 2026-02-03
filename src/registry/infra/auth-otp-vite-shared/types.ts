
export interface User {
	id: string;
	email: string;
	name: string | null;
	picture: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}


export interface JWTPayload {
	sub: string; 
	email: string;
	exp: number;
	iat: number;
	type: "access" | "refresh";
}


export interface RefreshToken {
	id: string;
	userId: string;
	tokenHash: string; 
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


export interface AuthValidationResult {
	user: User | null;
}

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
