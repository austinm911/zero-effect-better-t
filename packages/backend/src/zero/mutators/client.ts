/**
 * Database-free client mutators for zero-effect
 *
 * These mutators are shared between all implementations and contain NO database code.
 * They are safe for client bundles and use only Zero's Transaction API.
 *
 * @since 1.0.0
 */

import type { EffectTransaction } from "@zero-effect/zero-effect/client"
import {
	ZeroMutatorAuthError,
	ZeroMutatorValidationError,
} from "@zero-effect/zero-effect/shared/errors"
import { Effect, Schema } from "effect"
import { insertUserSchema } from "@/db/schema/auth"
import type { Schema as ZeroSchema } from "@/zero/schema/schema.gen"
import type { AuthData } from "../schema"

/**
 * Create database-free client mutators
 *
 * These mutators:
 * - Use only Zero's Transaction API (no direct database access)
 * - Perform client-side validation and authentication checks
 * - Are safe to include in client bundles
 * - Provide speculative mutations that get overridden by server results
 *
 * @since 1.0.0
 * @category constructors
 */
export function createClientMutators<TSchema extends ZeroSchema = ZeroSchema>(
	authData: AuthData | undefined,
) {
	return {
		user: {
			create: (
				tx: EffectTransaction<TSchema>,
				input: typeof insertUserSchema.Type,
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

					// 2. Input validation using Effect Schema
					const validatedInput = yield* Schema.decodeUnknown(insertUserSchema)(
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
					const result = yield* tx.mutate.user.insert({
						name: validatedInput.name,
						email: validatedInput.email,
					})

					// 4. Client-side logging
					yield* Effect.log("User created (client-side)", {
						id: result.id,
						userId: authData.userId,
					})

					return result
				}),
		},
	}
}

/**
 * Type for the client mutators
 * @since 1.0.0
 */
export type ClientMutators = ReturnType<typeof createClientMutators>
