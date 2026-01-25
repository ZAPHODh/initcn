"use server";

import { actionClient } from "@/lib/server/auth/client/safe-action";

type HealthCheckStatus = "ok" | "warning" | "error";

interface HealthCheck {
	status: HealthCheckStatus;
	message: string;
	hint?: string;
}

interface HealthCheckResult {
	database: HealthCheck;
	redis: HealthCheck;
	email: HealthCheck;
	oauth: HealthCheck;
	session: HealthCheck;
}

export const checkAuthHealth = actionClient
	.metadata({ actionName: "check-auth-health" })
	.action(async () => {
		const checks: HealthCheckResult = {
			database: await checkDatabaseConnection(),
			redis: await checkRedisConnection(),
			email: await checkEmailService(),
			oauth: await checkOAuthConfig(),
			session: await checkSessionCookie(),
		};

		const warnings = generateWarnings(checks);

		return {
			success: true,
			checks,
			warnings,
		};
	});

async function checkDatabaseConnection(): Promise<HealthCheck> {
	try {
		const { prisma } = await import("@/lib/server/auth/db");
		await prisma.$queryRaw`SELECT 1`;
		return { status: "ok", message: "Database connected" };
	} catch (error) {
		return {
			status: "error",
			message: "Database connection failed",
			hint: "Check DATABASE_URL in .env.local. Ensure database is running and credentials are correct.",
		};
	}
}

async function checkRedisConnection(): Promise<HealthCheck> {
	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		return {
			status: "warning",
			message: "Redis not configured (rate limiting disabled)",
			hint: "Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for rate limiting. Get free Redis at upstash.com",
		};
	}

	try {
		const { Redis } = await import("@upstash/redis");
		const redis = new Redis({
			url: process.env.UPSTASH_REDIS_REST_URL,
			token: process.env.UPSTASH_REDIS_REST_TOKEN,
		});
		await redis.ping();
		return { status: "ok", message: "Redis connected" };
	} catch (error) {
		return {
			status: "error",
			message: "Redis connection failed",
			hint: "Verify UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are correct",
		};
	}
}

async function checkEmailService(): Promise<HealthCheck> {
	if (!process.env.RESEND_API_KEY) {
		return {
			status: "error",
			message: "Email service not configured",
			hint: "Add RESEND_API_KEY to .env.local. Get API key at resend.com",
		};
	}

	if (process.env.NODE_ENV === "development") {
		return {
			status: "ok",
			message: "Email service configured (dev mode: emails logged to console)",
		};
	}

	if (!process.env.RESEND_FROM_EMAIL) {
		return {
			status: "warning",
			message: "RESEND_FROM_EMAIL not set",
			hint: "Add RESEND_FROM_EMAIL to .env.local (e.g., 'noreply@yourdomain.com')",
		};
	}

	return { status: "ok", message: "Email service configured" };
}

async function checkOAuthConfig(): Promise<HealthCheck> {
	const googleClientId = process.env.GOOGLE_CLIENT_ID;
	const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
	const nextPublicUrl = process.env.NEXT_PUBLIC_URL;

	if (!googleClientId || !googleClientSecret) {
		return {
			status: "warning",
			message: "Google OAuth not configured (optional)",
			hint: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google sign-in",
		};
	}

	if (!nextPublicUrl) {
		return {
			status: "warning",
			message: "NEXT_PUBLIC_URL not set",
			hint: "Add NEXT_PUBLIC_URL to .env.local for OAuth callbacks (e.g., 'http://localhost:3000')",
		};
	}

	return { status: "ok", message: "OAuth configured" };
}

async function checkSessionCookie(): Promise<HealthCheck> {
	try {
		const { cookies } = await import("next/headers");
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get("session");

		if (sessionCookie) {
			return { status: "ok", message: "Session cookie can be read" };
		}

		return {
			status: "ok",
			message: "No active session (expected if not logged in)",
		};
	} catch (error) {
		return {
			status: "error",
			message: "Failed to read cookies",
			hint: "Ensure cookies API is available (Server Components only)",
		};
	}
}

function generateWarnings(checks: HealthCheckResult): string[] {
	const warnings: string[] = [];

	if (checks.database.status === "error") {
		warnings.push("Database connection is required for authentication to work");
	}

	if (checks.redis.status === "warning") {
		warnings.push("Without Redis, rate limiting will use in-memory storage (resets on server restart)");
	}

	if (checks.email.status === "error") {
		warnings.push("Email service is required to send OTP codes");
	}

	if (checks.oauth.status === "warning" && checks.oauth.message.includes("Google")) {
		warnings.push("Google OAuth is optional but recommended for better user experience");
	}

	return warnings;
}
