"use server";

import { cookies } from "next/headers";
import type {
	ORM,
	Framework,
	ProjectConfig,
} from "@/components/config-builder/types";

const COOKIE_NAME = "initcn-config";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;


export async function setConfigAction(config: ProjectConfig) {
	const cookieStore = await cookies();

	cookieStore.set(COOKIE_NAME, JSON.stringify(config), {
		maxAge: COOKIE_MAX_AGE,
		path: "/",
		sameSite: "lax",
	});
}

export async function getConfigAction(): Promise<ProjectConfig> {
	const cookieStore = await cookies();
	const configCookie = cookieStore.get(COOKIE_NAME);

	if (!configCookie?.value) {
		return { orm: "prisma", framework: "nextjs" };
	}

	try {
		return JSON.parse(configCookie.value);
	} catch {
		return { orm: "prisma", framework: "nextjs" };
	}
}
