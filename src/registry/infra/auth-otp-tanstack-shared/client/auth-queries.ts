import { useQuery, useSuspenseQuery, type QueryClient } from "@tanstack/react-query";
import { authKeys } from "./query-keys";
import type { User, MeResponse } from "@/lib/server/auth/types";

/**
 * Fetch the current authenticated user from the backend
 * This function is used by TanStack Query hooks
 */
export async function fetchCurrentUser(): Promise<User | null> {
	try {
		const response = await fetch("/api/auth/me", {
			credentials: "include", // Send httpOnly cookies
		});

		if (!response.ok) {
			if (response.status === 401) {
				// User is not authenticated
				return null;
			}
			throw new Error("Failed to fetch current user");
		}

		const data: MeResponse = await response.json();
		return data.user || null;
	} catch (error) {
		console.error("Error fetching current user:", error);
		return null;
	}
}

/**
 * Hook to get the current authenticated user
 *
 * Uses standard useQuery for non-suspense usage
 * Returns loading states and error handling
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { data: user, isLoading, error } = useCurrentUser();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error />;
 *   if (!user) return <LoginPrompt />;
 *
 *   return <div>Welcome, {user.name}</div>;
 * }
 * ```
 */
export function useCurrentUser() {
	return useQuery({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
		gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
		retry: (failureCount, error) => {
			// Don't retry on 401 (unauthenticated)
			if (error instanceof Response && error.status === 401) {
				return false;
			}
			// Retry up to 2 times for other errors
			return failureCount < 2;
		},
	});
}

/**
 * Hook to get the current user with Suspense support
 *
 * This hook will suspend while loading, allowing you to use React Suspense boundaries
 * Use this for better loading UX with strategic Suspense placement
 *
 * @example
 * ```tsx
 * function UserNav() {
 *   // This will suspend on initial load
 *   const { data: user } = useCurrentUserSuspense();
 *
 *   if (!user) {
 *     return <LoginButton />;
 *   }
 *
 *   return <UserMenu user={user} />;
 * }
 *
 * // Wrap with Suspense in parent
 * <Suspense fallback={<Skeleton />}>
 *   <UserNav />
 * </Suspense>
 * ```
 */
export function useCurrentUserSuspense() {
	return useSuspenseQuery({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}

/**
 * Prefetch the current user data
 * Useful in route loaders to avoid loading states
 *
 * @example
 * ```tsx
 * // In TanStack Router loader
 * export const Route = createFileRoute('/_authenticated')({
 *   loader: async ({ context }) => {
 *     await prefetchCurrentUser(context.queryClient);
 *   },
 * });
 * ```
 */
export async function prefetchCurrentUser(queryClient: QueryClient): Promise<void> {
	await queryClient.prefetchQuery({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Ensure current user data is in the cache
 * If already cached and fresh, returns immediately
 * Otherwise, fetches from the server
 *
 * This is ideal for route loaders where you want guaranteed data
 *
 * @example
 * ```tsx
 * export const Route = createFileRoute('/__root')({
 *   loader: async ({ context }) => {
 *     const user = await ensureCurrentUser(context.queryClient);
 *     return { user };
 *   },
 * });
 * ```
 */
export async function ensureCurrentUser(queryClient: QueryClient): Promise<User | null> {
	return await queryClient.ensureQueryData({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000,
	});
}
