import { Effect } from "effect"
import { PostsService } from "./posts.service"

export class CrudService extends Effect.Service<CrudService>()("CrudService", {
	accessors: true,
	dependencies: [PostsService.Default],
	effect: Effect.gen(function* () {
		// Yield all your services here
		const posts = yield* PostsService

		return {
			// Return them so you can access them like `Crud.posts.create` or `const crud = yield* Crud` and then `crud.posts.create`
			posts,
		}
	}),
}) {}
