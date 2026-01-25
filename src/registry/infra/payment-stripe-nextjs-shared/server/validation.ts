/**
 * Validation Schemas
 * Zod schemas for API request validation
 */

import { z } from "zod";

/**
 * Schema for checkout session creation
 */
export const createCheckoutSchema = z.object({
	plan: z.enum(["simple", "pro"]),
	interval: z.enum(["monthly", "yearly"]),
	locale: z.string().optional(),
});

/**
 * Schema for webhook event validation
 */
export const webhookEventSchema = z.object({
	type: z.string(),
	data: z.object({
		object: z.any(),
	}),
});
