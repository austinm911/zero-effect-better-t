import {
	boolean,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "@/lib/drizzle-effect"
import { user } from "./auth"

/**
 * Blog post table schema.
 * The column name property is omitted as per project conventions.
 */
export const posts = pgTable("posts", {
	id: serial().primaryKey(),
	title: text().notNull(),
	content: text().notNull(),
	authorId: text()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	published: boolean().default(false),
	createdAt: timestamp().notNull().defaultNow(),
	updatedAt: timestamp().notNull().defaultNow(),
})

export const insertPostSchema = createInsertSchema(posts)
export const selectPostSchema = createSelectSchema(posts)

/**
 * Tag table schema.
 * The column name property is omitted as per project conventions.
 */
export const tags = pgTable("tags", {
	id: serial().primaryKey(),
	name: text().notNull().unique(),
	createdAt: timestamp().notNull().defaultNow(),
})

export const insertTagSchema = createInsertSchema(tags)
export const selectTagSchema = createSelectSchema(tags)

/**
 * Post-Tag join table schema.
 * The column name property is omitted as per project conventions.
 */
export const postTags = pgTable(
	"post_tags",
	{
		postId: integer()
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		tagId: integer()
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.postId, t.tagId] })],
)

export const insertPostTagSchema = createInsertSchema(postTags)
export const selectPostTagSchema = createSelectSchema(postTags)
