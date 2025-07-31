import { SqlClient } from "@effect/sql"
import { faker } from "@faker-js/faker"
import type { EffectTransaction } from "@zero-effect/zero-effect/client"
import { Effect, Schema } from "effect"
import { Database } from "@/db/client"
import { type insertPostSchema, posts, postTags } from "@/db/schema"
import type { Schema as ZeroSchema } from "@/zero/schema/schema.gen"

class PostsServiceError extends Schema.TaggedError<PostsServiceError>()(
	"PostsServiceError",
	{
		message: Schema.String,
	},
) {}

/**
 * This can only run server side, so it depends on the database client.
 *
 */
class PostsServiceServer extends Effect.Service<PostsServiceServer>()(
	"PostsServiceServer",
	{
		dependencies: [Database.Live],
		effect: Effect.gen(function* () {
			// We have access to the database client here and all the typed schema
			const db = yield* Database
			const sql = yield* SqlClient.SqlClient

			return {
				/**
				 * Create a post and associated post tag, wrapped in a tracing span.
				 * The span name is "create" for observability and debugging.
				 */
				create: Effect.fn("create")(function* (
					input: typeof insertPostSchema.Type,
				) {
					const [result] = yield* db.insert(posts).values(input).returning()

					if (!result) {
						// Return a tagged error if post creation fails
						return yield* PostsServiceError.make({
							message: "Failed to create post",
						})
					}

					// Create a post tag for the new post
					yield* db.insert(postTags).values({
						postId: result.id,
						tagId: faker.number.int(),
					})
				}, sql.withTransaction),

				// `posts` is typesafe with the `posts` table
				list: () => db.query.posts.findMany(),
			}
		}),
	},
) {}

/**
 * This can only run client side, so it depends on the EffectTransaction, which converts to a Promise with Zero's sync engine.
 *
 * This will run as an optimisitc mutation before the server mutators are run.
 */
class PostsServiceClient extends Effect.Service<PostsServiceClient>()(
	"PostsServiceClient",
	{
		effect: Effect.gen(function* () {
			return {
				create: (
					tx: EffectTransaction<ZeroSchema>,
					input: typeof insertPostSchema.Type,
				) => tx.mutate.posts.insert(input),

				list: (tx: EffectTransaction<ZeroSchema>) => tx.query.posts,
			}
		}),
	},
) {}
