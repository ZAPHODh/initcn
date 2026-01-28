import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	rootLoader,
	protectedLoader,
	guestOnlyLoader,
	type RouteLoaderContext,
} from "./route-protection";

/**
 * QueryClient instance for the app
 *
 * Configure this according to your needs. The default configuration:
 * - staleTime: 5 minutes - data is considered fresh for 5 minutes
 * - gcTime: 10 minutes - unused data is garbage collected after 10 minutes
 */
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
		},
	},
});

/**
 * Root layout component
 *
 * This wraps all routes with the QueryClientProvider to make
 * TanStack Query available throughout the app
 */
function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	);
}

/**
 * Router configuration with React Router data router API
 *
 * This is an example router configuration. You should customize this
 * based on your app's routes and structure.
 *
 * Key features:
 * - Root loader prefetches user data on initial load
 * - Protected routes redirect to login if unauthenticated
 * - Guest-only routes (login) redirect to dashboard if authenticated
 * - Lazy loading for code splitting
 * - React Router v7 future flags for forward compatibility
 *
 * @example
 * ```tsx
 * // main.tsx
 * import { AppRouter } from '@/lib/server/auth/routes/router';
 *
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <AppRouter />
 *   </React.StrictMode>
 * );
 * ```
 */
export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <RootLayout />,
			loader: (args) =>
				rootLoader({ ...args, context: { queryClient } as RouteLoaderContext }),
			children: [
				{
					// Login page - redirect authenticated users
					path: "/login",
					lazy: () => import("./pages/login"),
					loader: (args) =>
						guestOnlyLoader({
							...args,
							context: { queryClient } as RouteLoaderContext,
						}),
				},
				{
					// Protected dashboard - require authentication
					path: "/dashboard",
					lazy: () => import("./pages/dashboard"),
					loader: (args) =>
						protectedLoader({
							...args,
							context: { queryClient } as RouteLoaderContext,
						}),
				},
				{
					// Example: Public homepage with optional auth
					index: true,
					lazy: () => import("./pages/home"),
				},
			],
		},
	],
	{
		// Enable React Router v7 future flags for forward compatibility
		future: {
			v7_startTransition: true,
			v7_relativeSplatPath: true,
			v7_fetcherPersist: true,
			v7_normalizeFormMethod: true,
			v7_partialHydration: true,
			v7_skipActionErrorRevalidation: true,
		},
	},
);

/**
 * App router component
 *
 * This is the main entry point for your app's routing.
 * Render this in your main.tsx file.
 *
 * @example
 * ```tsx
 * // main.tsx
 * import React from 'react';
 * import ReactDOM from 'react-dom/client';
 * import { AppRouter } from '@/lib/server/auth/routes/router';
 * import './index.css';
 *
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <AppRouter />
 *   </React.StrictMode>
 * );
 * ```
 */
export function AppRouter() {
	return <RouterProvider router={router} />;
}
