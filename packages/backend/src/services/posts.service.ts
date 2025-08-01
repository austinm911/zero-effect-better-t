import { SqlClient } from "@effect/sql"
import type { SqlError } from "@effect/sql/SqlError"
import { faker } from "@faker-js/faker"
import type {
	EffectTransaction,
	ZeroMutatorDatabaseError,
} from "@zero-effect/zero-effect/client"
import { Context, Effect, Layer, Schema } from "effect"
import { Database } from "@/db/client"
import {
	type insertPostSchema,
	posts,
	postTags,
	type selectPostSchema,
} from "@/db/schema"
import type { Schema as ZeroSchema } from "@/zero/schema/schema.gen"

class PostsServiceError extends Schema.TaggedError<PostsServiceError>()(
	"PostsServiceError",
	{
		message: Schema.String,
	},
) {}

type PostServerErrors = PostsServiceError | SqlError

interface PostsServiceClient {
	readonly _tag: "client"
	readonly create: (
		tx: EffectTransaction<ZeroSchema>,
		input: typeof insertPostSchema.Type,
	) => Effect.Effect<void, ZeroMutatorDatabaseError>
}

interface PostsServiceServer {
	readonly _tag: "server"
	readonly create: (
		input: typeof insertPostSchema.Type,
	) => Effect.Effect<typeof selectPostSchema.Type, PostServerErrors>
	readonly list: () => Effect.Effect<
		(typeof selectPostSchema.Type)[],
		PostServerErrors
	>
}

type PostsService = PostsServiceClient | PostsServiceServer

class PostsServiceTag extends Context.Tag("PostsService")<
	PostsServiceTag,
	PostsService
>() {}

export const PostsServiceClientLive = Layer.succeed(PostsServiceTag, {
	_tag: "client",
	create: (
		tx: EffectTransaction<ZeroSchema>,
		input: typeof insertPostSchema.Type,
	) => tx.mutate.posts.insert(input),
})

export const PostsServiceServerLive = Layer.effect(
	PostsServiceTag,
	Effect.gen(function* () {
		const db = yield* Database
		const sql = yield* SqlClient.SqlClient // use this to wrap the effect in a transaction

		return {
			_tag: "server",
			create: Effect.fn("create")(function* (
				input: typeof insertPostSchema.Type,
			) {
				const [result] = yield* db.insert(posts).values(input).returning()
				if (!result) {
					return yield* PostsServiceError.make({
						message: "Failed to create post",
					})
				}
				// Mock creating a post tag for the new post
				yield* db
					.insert(postTags)
					.values({
						postId: result.id,
						tagId: faker.number.int(),
					})
					.returning()
				return result
			}, sql.withTransaction),
			list: Effect.fn("list")(function* () {
				return yield* db.query.posts.findMany()
			}),
		}
	}),
)
