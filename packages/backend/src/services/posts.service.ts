import { Effect } from "effect"
import { Drizzle } from "@/db/client"
import { type insertPostSchema, posts } from "@/db/schema"

export class PostsService extends Effect.Service<PostsService>()(
	"PostsService",
	{
		accessors: true,
		dependencies: [Drizzle.Default],
		effect: Effect.gen(function* () {
			const db = yield* Drizzle

			const create = Effect.fn("create")(function* (
				input: typeof insertPostSchema.Type,
			) {
				const post = yield* db.insert(posts).values({
					...input,
				})
				return post
			})

			const list = Effect.fn("list")(function* () {
				const posts = yield* db.query.posts.findMany()
				return posts
			})

			return {
				list,
				create,
			}
		}),
	},
) {}
