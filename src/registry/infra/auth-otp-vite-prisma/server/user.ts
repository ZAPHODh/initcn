import { prisma } from "../db";
import type { User } from "@/lib/types";

export async function createUser(
	email: string,
	data?: { name?: string; picture?: string; emailVerified?: boolean },
): Promise<User> {
	return await prisma.user.create({
		data: {
			email,
			name: data?.name ?? null,
			picture: data?.picture ?? null,
			emailVerified: data?.emailVerified ?? false,
		},
	});
}

export async function getUserByEmail(email: string): Promise<User | null> {
	return await prisma.user.findUnique({
		where: { email },
	});
}

export async function getUserById(id: string): Promise<User | null> {
	return await prisma.user.findUnique({
		where: { id },
	});
}

export async function updateUser(
	userId: string,
	data: Partial<Pick<User, "name" | "picture" | "emailVerified">>,
): Promise<User> {
	return await prisma.user.update({
		where: { id: userId },
		data,
	});
}

export async function deleteUser(userId: string): Promise<void> {
	await prisma.user.delete({
		where: { id: userId },
	});
}

export async function findOrCreateUser(
	email: string,
	data?: { name?: string; picture?: string; emailVerified?: boolean },
): Promise<User> {
	let user = await getUserByEmail(email);

	if (!user) {
		user = await createUser(email, data);
	}

	return user;
}
