import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const users = pgTable("users", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	name: text("name"),
	picture: text("picture"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const sessions = pgTable(
	"sessions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		expiresAt: timestamp("expires_at").notNull(),
	},
	(table) => ({
		userIdIdx: index("sessions_user_id_idx").on(table.userId),
	}),
);

export const emailVerificationCodes = pgTable(
	"email_verification_codes",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		code: text("code").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
	},
	(table) => ({
		userIdIdx: index("email_verification_codes_user_id_idx").on(table.userId),
	}),
);

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	emailVerificationCodes: many(emailVerificationCodes),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const emailVerificationCodesRelations = relations(
	emailVerificationCodes,
	({ one }) => ({
		user: one(users, {
			fields: [emailVerificationCodes.userId],
			references: [users.id],
		}),
	}),
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;
