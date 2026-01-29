import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import type { QueryClient } from "@tanstack/react-query";
import { ensureCurrentUser } from "../client/auth-queries";
import type { User } from "../types";

export interface RouteLoaderContext {
	queryClient: QueryClient;
}

export async function rootLoader({
	context,
}: LoaderFunctionArgs & { context: RouteLoaderContext }): Promise<{
	user: User | null;
}> {
	const { queryClient } = context;
	const user = await ensureCurrentUser(queryClient);
	return { user };
}

export async function protectedLoader({
	context,
	request,
}: LoaderFunctionArgs & { context: RouteLoaderContext }): Promise<{
	user: User;
}> {
	const { queryClient } = context;
	const user = await ensureCurrentUser(queryClient);

	if (!user) {
		const url = new URL(request.url);
		throw redirect(
			`/login?redirect=${encodeURIComponent(url.pathname + url.search)}`,
		);
	}

	return { user };
}

export async function optionalAuthLoader({
	context,
}: LoaderFunctionArgs & { context: RouteLoaderContext }): Promise<{
	user: User | null;
}> {
	const { queryClient } = context;
	const user = await ensureCurrentUser(queryClient);

	return { user };
}

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
