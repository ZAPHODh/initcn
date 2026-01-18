/**
 * Safe Action Client
 * Type-safe server action wrapper with error handling
 */

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";

export const actionClient = createSafeActionClient({
	defineMetadataSchema: () =>
		z.object({
			actionName: z.string(),
		}),
	handleServerError: (e) => {
		console.error("Payment action error:", e.message);
		return {
			success: false,
			message: e.message,
		};
	},
});
