import { prisma } from "../db";
import type { User } from "@/lib/server/auth/types";

/**
 * Create a new user
 *
 * @param email - User email (must be unique)
 * @param data - Optional user data (name, picture)
 * @returns Created user
 */
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

/**
 * Get user by email
 *
 * @param email - User email
 * @returns User if found, null otherwise
 */
export async function getUserByEmail(email: string): Promise<User | null> {
	return await prisma.user.findUnique({
		where: { email },
	});
}

/**
 * Get user by ID
 *
 * @param id - User ID
 * @returns User if found, null otherwise
 */
export async function getUserById(id: string): Promise<User | null> {
	return await prisma.user.findUnique({
		where: { id },
	});
}

/**
 * Update user data
 *
 * @param userId - User ID
 * @param data - Data to update
 * @returns Updated user
 */
export async function updateUser(
	userId: string,
	data: Partial<Pick<User, "name" | "picture" | "emailVerified">>,
): Promise<User> {
	return await prisma.user.update({
		where: { id: userId },
		data,
	});
}

/**
 * Delete a user and all related data
 *
 * @param userId - User ID
 */
export async function deleteUser(userId: string): Promise<void> {
	await prisma.user.delete({
		where: { id: userId },
	});
}

/**
 * Find or create user by email
 *
 * Useful for OAuth flows where we want to create a user if they don't exist
 *
 * @param email - User email
 * @param data - Optional user data for creation
 * @returns User (existing or newly created)
 */
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
