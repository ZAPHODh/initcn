import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	rootLoader,
	protectedLoader,
	guestOnlyLoader,
	type RouteLoaderContext,
} from "./route-protection";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		},
	},
});

function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	);
}

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <RootLayout />,
			loader: (args) =>
				rootLoader({ ...args, context: { queryClient } as RouteLoaderContext }),
			children: [
				{
					path: "/login",
					lazy: () => import("./pages/login"),
					loader: (args) =>
						guestOnlyLoader({
							...args,
							context: { queryClient } as RouteLoaderContext,
						}),
				},
				{
					path: "/dashboard",
					lazy: () => import("./pages/dashboard"),
					loader: (args) =>
						protectedLoader({
							...args,
							context: { queryClient } as RouteLoaderContext,
						}),
				},
				{
					index: true,
					lazy: () => import("./pages/home"),
				},
			],
		},
	],
	{
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

export function AppRouter() {
	return <RouterProvider router={router} />;
}
