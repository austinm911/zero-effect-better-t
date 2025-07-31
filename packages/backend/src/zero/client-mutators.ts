/**
 * Database-free client mutators for zero-effect
 *
 * These mutators are shared between all implementations and contain NO database code.
 * They are safe for client bundles and use only Zero's Transaction API.
 *
 * @since 1.0.0
 */

import type { CustomMutatorDefs } from "@rocicorp/zero"
import type { EffectTransaction } from "@zero-effect/zero-effect/client"
import {
	convertEffectMutatorsToPromise,
	ZeroMutatorAuthError,
	ZeroMutatorValidationError,
} from "@zero-effect/zero-effect/client"
import { Effect, Runtime, Schema } from "effect"
import { insertPostSchema, selectPostSchema } from "@/db/schema"
import type { Schema as ZeroSchema } from "@/zero/schema/schema.gen"
import type { AuthData } from "./schema"

/**
 * Create Effect-based mutators
 *
 * These mutators:
 * - Use only Zero's Transaction API (no direct database access)
 * - Perform client-side validation and authentication checks
 * - Return Effect generators that can be converted to Promises
 *
 * @since 1.0.0
 * @category constructors
 */
export function createMutators(authData: AuthData | undefined) {
	return {
		posts: {
			insert: (
				tx: EffectTransaction<ZeroSchema>,
				input: typeof insertPostSchema,
			) =>
				Effect.gen(function* () {
					// 1. Authentication check
					if (!authData) {
						return yield* Effect.fail(
							new ZeroMutatorAuthError({
								message: "Not authenticated",
							}),
						)
					}

					// 2. Input validation using custom schema
					const validatedInput = yield* Schema.decodeUnknown(insertPostSchema)(
						input,
					).pipe(
						Effect.mapError(
							(error) =>
								new ZeroMutatorValidationError({
									message: `Invalid input: ${String(error)}`,
								}),
						),
					)

					// 3. Use Zero's Transaction API (speculative mutation)
					yield* tx.mutate.posts.insert({
						id: null, // Let database auto-generate
						title: validatedInput.title,
						content: validatedInput.content,
						authorId: validatedInput.authorId,
						published: validatedInput.published ?? false,
					})

					// 4. Client-side logging
					yield* Effect.log("Post created (client-side)", {
						userId: authData.userId,
					})
				}),

			delete: (
				tx: EffectTransaction<ZeroSchema>,
				// We only need the id from the schema
				input: (typeof selectPostSchema.Type)["id"],
			) =>
				Effect.gen(function* () {
					if (!authData) {
						return yield* Effect.fail(
							new ZeroMutatorAuthError({
								message: "Not authenticated",
							}),
						)
					}

					// 2. Input validation, validating only the id
					const validatedInput = yield* Schema.decodeUnknown(selectPostSchema)(
						input,
					).pipe(
						Effect.mapError(
							(error) =>
								new ZeroMutatorValidationError({
									message: `Invalid input: ${String(error)}`,
								}),
						),
					)

					// 3. Use Zero's Transaction API
					yield* tx.mutate.posts.delete({
						id: validatedInput.id,
					})

					// 4. Client-side logging
					yield* Effect.log("Post deleted (client-side)", {
						id: validatedInput.id,
						userId: authData.userId,
					})
				}) as Effect.Effect<
					void,
					ZeroMutatorAuthError | ZeroMutatorValidationError,
					never
				>,
		},
	}
}

/**
 * Create client mutators by converting Effect generators to Promises
 *
 * @since 1.0.0
 * @category constructors
 */
export function createClientMutators(
	authData: AuthData | undefined,
): CustomMutatorDefs<ZeroSchema> {
	const effectMutators = createMutators(authData)
	const clientRuntime = Runtime.defaultRuntime
	return convertEffectMutatorsToPromise(effectMutators, clientRuntime)
}

export type Mutators = ReturnType<typeof createClientMutators>
