/**
 * Drizzle ORM Schema for auth-otp
 *
 * Example schema definitions for use with Drizzle ORM
 * Copy and adapt to your existing schema
 */

import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// User table
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name"),
  picture: text("picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session table
export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table): Record<string, any> => ({
    userIdIdx: index("session_user_id_idx").on(table.userId),
  }),
);

// Email verification code table
export const emailVerificationCodes = pgTable(
  "email_verification_code",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table): Record<string, any> => ({
    userIdIdx: index("email_verification_code_user_id_idx").on(table.userId),
  }),
);

// Relations
export const usersRelations = relations(users, ({ many }: { many: any }) => ({
  sessions: many(sessions),
  emailVerificationCodes: many(emailVerificationCodes),
}));

export const sessionsRelations = relations(
  sessions,
  ({ one }: { one: any }) => ({
    user: one(users, {
      fields: [sessions.userId],
      references: [users.id],
    }),
  }),
);

export const emailVerificationCodesRelations = relations(
  emailVerificationCodes,
  ({ one }: { one: any }) => ({
    user: one(users, {
      fields: [emailVerificationCodes.userId],
      references: [users.id],
    }),
  }),
);
