import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "@/lib/drizzle-effect"

/**
 * User table schema.
 * Column name property omitted for brevity and convention.
 */
export const user = pgTable("user", {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	emailVerified: boolean().notNull(),
	image: text(),
	createdAt: timestamp().notNull(),
	updatedAt: timestamp().notNull(),
})

export const insertUserSchema = createInsertSchema(user)
export const selectUserSchema = createSelectSchema(user)

/**
 * Session table schema.
 * Column name property omitted for brevity and convention.
 */
export const session = pgTable("session", {
	id: text().primaryKey(),
	expiresAt: timestamp().notNull(),
	token: text().notNull().unique(),
	createdAt: timestamp().notNull(),
	updatedAt: timestamp().notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
})

export const insertSessionSchema = createInsertSchema(session)
export const selectSessionSchema = createSelectSchema(session)

/**
 * Account table schema.
 * Column name property omitted for brevity and convention.
 */
export const account = pgTable("account", {
	id: text().primaryKey(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp(),
	refreshTokenExpiresAt: timestamp(),
	scope: text(),
	password: text(),
	createdAt: timestamp().notNull(),
	updatedAt: timestamp().notNull(),
})

export const insertAccountSchema = createInsertSchema(account)
export const selectAccountSchema = createSelectSchema(account)

/**
 * Verification table schema.
 * Column name property omitted for brevity and convention.
 */
export const verification = pgTable("verification", {
	id: text().primaryKey(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp().notNull(),
	createdAt: timestamp(),
	updatedAt: timestamp(),
})

export const insertVerificationSchema = createInsertSchema(verification)
export const selectVerificationSchema = createSelectSchema(verification)
