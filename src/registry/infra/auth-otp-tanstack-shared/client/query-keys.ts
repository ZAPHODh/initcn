/**
 * Query key factory pattern for TanStack Query
 *
 * This pattern provides type-safe, hierarchical query keys that make it easy to:
 * - Invalidate related queries (e.g., all auth queries)
 * - Target specific queries for refetching
 * - Avoid key collisions
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

export const authKeys = {
	/**
	 * Base key for all auth-related queries
	 */
	all: ["auth"] as const,

	/**
	 * Query key for the current authenticated user
	 * Used in useCurrentUser() hook
	 */
	currentUser: () => [...authKeys.all, "current-user"] as const,

	/**
	 * Query key for user sessions list
	 * Used for "active sessions" management UI
	 */
	sessions: () => [...authKeys.all, "sessions"] as const,

	/**
	 * Query key for a specific session by ID
	 */
	session: (sessionId: string) =>
		[...authKeys.sessions(), sessionId] as const,
} as const;

/**
 * Example usage:
 *
 * // Invalidate all auth queries
 * queryClient.invalidateQueries({ queryKey: authKeys.all });
 *
 * // Invalidate only current user query
 * queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
 *
 * // Prefetch current user
 * await queryClient.prefetchQuery({
 *   queryKey: authKeys.currentUser(),
 *   queryFn: fetchCurrentUser,
 * });
 */
