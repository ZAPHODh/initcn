import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import type { QueryClient } from "@tanstack/react-query";
import { ensureCurrentUser } from "../client/auth-queries";
import type { User } from "../types";

/**
 * Context type for route loaders
 *
 * This is passed to all loader functions to provide access to the QueryClient
 */
export interface RouteLoaderContext {
	queryClient: QueryClient;
}

/**
 * Root loader - prefetches user data on all routes
 *
 * Use this as the loader for the root route to ensure user data is
 * fetched on initial load and available throughout the app
 *
 * @example
 * ```tsx
 * // router.tsx
 * const router = createBrowserRouter([
 *   {
 *     path: "/",
 *     element: <RootLayout />,
 *     loader: (args) => rootLoader({ ...args, context: { queryClient } }),
 *     children: [...],
 *   },
 * ]);
 * ```
 */
export async function rootLoader({
	context,
}: LoaderFunctionArgs & { context: RouteLoaderContext }): Promise<{
	user: User | null;
}> {
	const { queryClient } = context;
	const user = await ensureCurrentUser(queryClient);
	return { user };
}

/**
 * Protected route loader - redirects unauthenticated users to login
 *
 * Use this as the loader for routes that require authentication.
 * Unauthenticated users will be redirected to /login with a redirect
 * parameter to return them to the original page after login.
 *
 * @example
 * ```tsx
 * // router.tsx
 * {
 *   path: "/dashboard",
 *   loader: (args) => protectedLoader({ ...args, context: { queryClient } }),
 *   element: <Dashboard />,
 * }
 *
 * // Dashboard component
 * function Dashboard() {
 *   const { user } = useLoaderData(); // User is guaranteed to exist
 *   return <div>Welcome, {user.email}!</div>;
 * }
 * ```
 */
export async function protectedLoader({
	context,
	request,
}: LoaderFunctionArgs & { context: RouteLoaderContext }): Promise<{
	user: User;
}> {
	const { queryClient } = context;

	// Check if user is authenticated
	const user = await ensureCurrentUser(queryClient);

	if (!user) {
		// Redirect to login with the current location as redirect parameter
		const url = new URL(request.url);
		throw redirect(
			`/login?redirect=${encodeURIComponent(url.pathname + url.search)}`,
		);
	}

	// Return user to make it available via useLoaderData()
	return { user };
}

/**
 * Optional auth loader - allows both authenticated and unauthenticated users
 *
 * Use this when you want to show different UI based on auth state,
 * but don't want to force a redirect
 *
 * @example
 * ```tsx
 * // router.tsx
 * {
 *   path: "/",
 *   loader: (args) => optionalAuthLoader({ ...args, context: { queryClient } }),
 *   element: <Home />,
 * }
 *
 * // Home component
 * function Home() {
 *   const { user } = useLoaderData();
 *
 *   return (
 *     <div>
 *       {user ? (
 *         <div>Welcome back, {user.email}!</div>
 *       ) : (
 *         <div>Welcome! Please log in.</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export async function optionalAuthLoader({
	context,
}: LoaderFunctionArgs & { context: RouteLoaderContext }): Promise<{
	user: User | null;
}> {
	const { queryClient } = context;

	// Get user without throwing on unauthenticated
	const user = await ensureCurrentUser(queryClient);

	return { user };
}

/**
 * Guest-only loader - redirects authenticated users away from auth pages
 *
 * Use this on login/signup pages to prevent authenticated users
 * from accessing them. Authenticated users will be redirected to
 * the dashboard or the URL specified in the redirect query parameter.
 *
 * @example
 * ```tsx
 * // router.tsx
 * {
 *   path: "/login",
 *   loader: (args) => guestOnlyLoader({ ...args, context: { queryClient } }),
 *   element: <LoginPage />,
 * }
 * ```
 */
export async function guestOnlyLoader({
	context,
	request,
}: LoaderFunctionArgs & { context: RouteLoaderContext }): Promise<null> {
	const { queryClient } = context;

	const user = await ensureCurrentUser(queryClient);

	if (user) {
		// User is already authenticated, redirect to dashboard or redirect URL
		const url = new URL(request.url);
		const redirectTo = url.searchParams.get("redirect") || "/dashboard";

		throw redirect(redirectTo);
	}

	return null;
}
