import { type Duration, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  throw new Error(
    "Missing required Redis configuration. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.",
  );
}

const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

export function createRateLimiter(config: {
  requests: number;
  window: Duration;
}) {
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
  const limiter = createRateLimiter({ requests, window });

  const result = await limiter.limit(`email:${email}`);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function rateLimitByIP(
  ip: string,
  requests = 20,
  window = "15 m" as Duration,
) {
  const limiter = createRateLimiter({ requests, window });

  const result = await limiter.limit(`ip:${ip}`);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function trackFailedAttempt(
  key: string,
  maxAttempts = 10,
  windowSeconds = 3600,
) {
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
}

export async function resetFailedAttempts(key: string) {
  await redis.del(`failed:${key}`);
}
