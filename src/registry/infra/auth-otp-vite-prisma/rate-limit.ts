import { type Duration, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback for failed attempts when Redis is unavailable
const failedAttempts = new Map<
	string,
	{ attempts: number; lockedUntil: number }
>();

function getRedis(): Redis | null {
	if (!REDIS_URL || !REDIS_TOKEN) {
		return null;
	}
	return new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
}

const redis = getRedis();

export function createRateLimiter(config: {
	requests: number;
	window: Duration;
}): Ratelimit | null {
	if (!redis) {
		return null;
	}

	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(config.requests, config.window),
		prefix: "auth:ratelimit",
	});
}

export async function rateLimitByEmail(
	email: string,
	requests = 5,
	window = "15 m" as Duration,
) {
	try {
		const limiter = createRateLimiter({ requests, window });

		if (!limiter) {
			// Gracefully degrade when Redis is unavailable
			return {
				success: true,
				limit: requests,
				remaining: requests,
				reset: 0,
			};
		}

		const result = await limiter.limit(`email:${email}`);
		return {
			success: result.success,
			limit: result.limit,
			remaining: result.remaining,
			reset: result.reset,
		};
	} catch (error) {
		console.error("Rate limit error (email):", error);
		// Gracefully degrade on error
		return {
			success: true,
			limit: requests,
			remaining: requests,
			reset: 0,
		};
	}
}

export async function rateLimitByIP(
	ip: string,
	requests = 20,
	window = "15 m" as Duration,
) {
	try {
		const limiter = createRateLimiter({ requests, window });

		if (!limiter) {
			// Gracefully degrade when Redis is unavailable
			return {
				success: true,
				limit: requests,
				remaining: requests,
				reset: 0,
			};
		}

		const result = await limiter.limit(`ip:${ip}`);
		return {
			success: result.success,
			limit: result.limit,
			remaining: result.remaining,
			reset: result.reset,
		};
	} catch (error) {
		console.error("Rate limit error (IP):", error);
		// Gracefully degrade on error
		return {
			success: true,
			limit: requests,
			remaining: requests,
			reset: 0,
		};
	}
}

export async function trackFailedAttempt(
	key: string,
	maxAttempts = 10,
	windowSeconds = 3600,
) {
	const attemptsKey = `failed:${key}`;

	if (!redis) {
		// In-memory fallback when Redis is unavailable
		const now = Date.now();
		const existing = failedAttempts.get(key);

		// Check if locked
		if (existing && existing.lockedUntil > now) {
			return {
				locked: true,
				attempts: maxAttempts,
				remaining: 0,
			};
		}

		// Increment or initialize attempts
		const attempts =
			existing && existing.lockedUntil <= now ? existing.attempts + 1 : 1;

		// Check if should lock
		if (attempts >= maxAttempts) {
			failedAttempts.set(key, {
				attempts,
				lockedUntil: now + windowSeconds * 1000,
			});
			return {
				locked: true,
				attempts,
				remaining: 0,
			};
		}

		// Update attempts without lock
		failedAttempts.set(key, {
			attempts,
			lockedUntil: now,
		});

		return {
			locked: false,
			attempts,
			remaining: maxAttempts - attempts,
		};
	}

	// Redis implementation
	const attempts = await redis.incr(attemptsKey);

	if (attempts === 1) {
		await redis.expire(attemptsKey, windowSeconds);
	}

	const locked = attempts >= maxAttempts;

	return {
		locked,
		attempts,
		remaining: Math.max(0, maxAttempts - attempts),
	};
}

export async function resetFailedAttempts(key: string) {
	if (!redis) {
		// In-memory fallback
		failedAttempts.delete(key);
		return;
	}

	await redis.del(`failed:${key}`);
}
