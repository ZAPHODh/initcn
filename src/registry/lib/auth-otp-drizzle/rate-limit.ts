import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisEnabled = !!(REDIS_URL && REDIS_TOKEN);
const redis = isRedisEnabled
	? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
	: null;

export function createRateLimiter(config: {
	requests: number;
	window: string;
}) {
	if (!redis) return null; // Gracefully disable if no Redis

	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(config.requests, config.window),
		prefix: "auth:ratelimit",
	});
}

export async function rateLimitByEmail(
	email: string,
	requests = 5,
	window = "15 m",
) {
	const limiter = createRateLimiter({ requests, window });

	if (!limiter) {
		return {
			success: true,
			limit: requests,
			remaining: requests,
			reset: Date.now() + 900000,
		};
	}

	try {
		const result = await limiter.limit(`email:${email}`);
		return {
			success: result.success,
			limit: result.limit,
			remaining: result.remaining,
			reset: result.reset,
		};
	} catch (error) {
		console.error("Rate limit error:", error);
		return {
			success: true,
			limit: requests,
			remaining: requests,
			reset: Date.now() + 900000,
		};
	}
}

export async function rateLimitByIP(
	ip: string,
	requests = 20,
	window = "15 m",
) {
	const limiter = createRateLimiter({ requests, window });

	if (!limiter) {
		return {
			success: true,
			limit: requests,
			remaining: requests,
			reset: Date.now() + 900000,
		};
	}

	try {
		const result = await limiter.limit(`ip:${ip}`);
		return {
			success: result.success,
			limit: result.limit,
			remaining: result.remaining,
			reset: result.reset,
		};
	} catch (error) {
		console.error("Rate limit error:", error);
		return {
			success: true,
			limit: requests,
			remaining: requests,
			reset: Date.now() + 900000,
		};
	}
}

// In-memory storage for failed attempts (for when Redis is not available)
const failedAttempts = new Map<
	string,
	{ attempts: number; lockedUntil: number }
>();

export async function trackFailedAttempt(
	key: string,
	maxAttempts = 10,
	windowSeconds = 3600,
) {
	if (!redis) {
		// Use in-memory tracking
		const now = Date.now();
		const record = failedAttempts.get(key);

		if (record && record.lockedUntil > now) {
			return {
				locked: true,
				attempts: record.attempts,
				remaining: 0,
			};
		}

		const newAttempts = record && record.lockedUntil <= now ? 1 : (record?.attempts || 0) + 1;
		const locked = newAttempts >= maxAttempts;

		failedAttempts.set(key, {
			attempts: newAttempts,
			lockedUntil: locked ? now + windowSeconds * 1000 : 0,
		});

		return {
			locked,
			attempts: newAttempts,
			remaining: Math.max(0, maxAttempts - newAttempts),
		};
	}

	try {
		const attemptsKey = `failed:${key}`;
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
	} catch (error) {
		console.error("Failed attempt tracking error:", error);
		return {
			locked: false,
			attempts: 0,
			remaining: maxAttempts,
		};
	}
}

export async function resetFailedAttempts(key: string) {
	if (!redis) {
		failedAttempts.delete(key);
		return;
	}

	try {
		await redis.del(`failed:${key}`);
	} catch (error) {
		console.error("Reset failed attempts error:", error);
	}
}
