import type { QueryClient } from "@tanstack/react-query";
import { ensureCurrentUser } from "../client/auth-queries";
import type { User } from "../types";

/**
 * Auth loader context interface
 * This should be added to your TanStack Router root context
 */
export interface AuthLoaderContext {
	queryClient: QueryClient;
}

/**
 * Auth loader result
 * Contains the current user (or null if not authenticated)
 */
export interface AuthLoaderResult {
	user: User | null;
}

/**
 * Root auth loader for TanStack Router
 *
 * This loader should be used in your root route (`__root.tsx`) to:
 * - Prefetch the current user data
 * - Make user data available to all child routes
 * - Prevent loading flicker on protected routes
 *
 * @example
 * ```tsx
 * // routes/__root.tsx
 * import { createRootRouteWithContext } from '@tanstack/react-router';
 * import { authLoader, type AuthLoaderContext } from '@/lib/auth/routes/auth-loader';
 *
 * export const Route = createRootRouteWithContext<AuthLoaderContext>()({
 *   loader: authLoader,
 *   component: RootLayout,
 * });
 *
 * function RootLayout() {
 *   const { user } = Route.useLoaderData();
 *
 *   return (
 *     <div>
 *       {user ? <UserNav user={user} /> : <LoginButton />}
 *       <Outlet />
 *     </div>
 *   );
 * }
 * ```
 */
export async function authLoader({
	context,
}: {
	context: AuthLoaderContext;
}): Promise<AuthLoaderResult> {
	const { queryClient } = context;

	// Ensure the current user is in the cache
	// This will fetch if not cached, or return immediately if cached and fresh
	const user = await ensureCurrentUser(queryClient);

	return { user };
}

/**
 * Get the current user from the route context
 *
 * This is a helper function to access the authenticated user
 * from anywhere in your component tree
 *
 * @example
 * ```tsx
 * import { useRouteContext } from '@tanstack/react-router';
 * import { getCurrentUser } from '@/lib/auth/routes/auth-loader';
 *
 * function MyComponent() {
 *   const routeContext = useRouteContext({ from: '__root__' });
 *   const user = getCurrentUser(routeContext);
 *
 *   if (!user) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <div>Welcome, {user.name}</div>;
 * }
 * ```
 */
export function getCurrentUser(loaderData: AuthLoaderResult): User | null {
	return loaderData.user;
}
