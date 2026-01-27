import { redirect, type LoaderFunctionArgs } from "@tanstack/react-router";
import type { AuthLoaderContext } from "./auth-loader";
import { ensureCurrentUser } from "../client/auth-queries";

/**
 * Protected route loader for TanStack Router
 *
 * Use this as a `beforeLoad` function in layout routes to protect
 * all child routes from unauthenticated access
 *
 * @example
 * ```tsx
 * // routes/_authenticated.tsx
 * import { createFileRoute } from '@tanstack/react-router';
 * import { protectedRouteLoader } from '@/lib/auth/routes/protected-route';
 *
 * export const Route = createFileRoute('/_authenticated')({
 *   beforeLoad: protectedRouteLoader,
 *   component: AuthenticatedLayout,
 * });
 *
 * function AuthenticatedLayout() {
 *   return (
 *     <div>
 *       <UserNav />
 *       <Outlet />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // routes/_authenticated/dashboard.tsx
 * export const Route = createFileRoute('/_authenticated/dashboard')({
 *   component: Dashboard,
 * });
 *
 * function Dashboard() {
 *   const { user } = Route.useRouteContext(); // User is guaranteed to exist
 *   return <div>Welcome, {user.name}!</div>;
 * }
 * ```
 */
export async function protectedRouteLoader({
	context,
	location,
}: LoaderFunctionArgs & { context: AuthLoaderContext }) {
	const { queryClient } = context;

	// Check if user is authenticated
	const user = await ensureCurrentUser(queryClient);

	if (!user) {
		// Redirect to login with the current location as redirect parameter
		throw redirect({
			to: "/login",
			search: {
				redirect: location.href,
			},
		});
	}

	// Return user to make it available in route context
	return { user };
}

/**
 * Optional route protection (allows both authenticated and unauthenticated users)
 *
 * Use this when you want to show different UI based on auth state,
 * but don't want to force a redirect
 *
 * @example
 * ```tsx
 * // routes/index.tsx
 * import { createFileRoute } from '@tanstack/react-router';
 * import { optionalAuthLoader } from '@/lib/auth/routes/protected-route';
 *
 * export const Route = createFileRoute('/')({
 *   loader: optionalAuthLoader,
 *   component: Home,
 * });
 *
 * function Home() {
 *   const { user } = Route.useLoaderData();
 *
 *   return (
 *     <div>
 *       {user ? (
 *         <div>Welcome back, {user.name}!</div>
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
}: LoaderFunctionArgs & { context: AuthLoaderContext }) {
	const { queryClient } = context;

	// Get user without throwing on unauthenticated
	const user = await ensureCurrentUser(queryClient);

	return { user };
}

/**
 * Redirect authenticated users away from auth pages
 *
 * Use this on login/signup pages to prevent authenticated users
 * from accessing them
 *
 * @example
 * ```tsx
 * // routes/login.tsx
 * import { createFileRoute } from '@tanstack/react-router';
 * import { redirectAuthenticatedUsers } from '@/lib/auth/routes/protected-route';
 *
 * export const Route = createFileRoute('/login')({
 *   beforeLoad: redirectAuthenticatedUsers,
 *   component: LoginPage,
 * });
 * ```
 */
export async function redirectAuthenticatedUsers({
	context,
	search,
}: LoaderFunctionArgs & { context: AuthLoaderContext }) {
	const { queryClient } = context;

	const user = await ensureCurrentUser(queryClient);

	if (user) {
		// User is already authenticated, redirect to dashboard or redirect URL
		const redirectTo = (search as { redirect?: string })?.redirect || "/dashboard";

		throw redirect({
			to: redirectTo,
		});
	}
}
