import { useQuery, useSuspenseQuery, type QueryClient } from "@tanstack/react-query";
import { authKeys } from "./query-keys";
import type { User, MeResponse } from "../types";

export async function fetchCurrentUser(): Promise<User | null> {
	try {
		const response = await fetch("/api/auth/me", {
			credentials: "include",
		});

		if (!response.ok) {
			if (response.status === 401) {
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

export function useCurrentUser() {
	return useQuery({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: (failureCount, error) => {
			if (error instanceof Response && error.status === 401) {
				return false;
			}
			return failureCount < 2;
		},
	});
}

export function useCurrentUserSuspense() {
	return useSuspenseQuery({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}

export async function prefetchCurrentUser(queryClient: QueryClient): Promise<void> {
	await queryClient.prefetchQuery({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000,
	});
}

export async function ensureCurrentUser(queryClient: QueryClient): Promise<User | null> {
	return await queryClient.ensureQueryData({
		queryKey: authKeys.currentUser(),
		queryFn: fetchCurrentUser,
		staleTime: 5 * 60 * 1000,
	});
}
