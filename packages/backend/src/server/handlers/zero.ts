import { HttpApiBuilder } from "@effect/platform"
import type { ReadonlyJSONObject } from "@rocicorp/zero"
import { Effect, Layer } from "effect"
import { createMutators } from "@/zero/client-mutators"
import { MutatorError, ZeroMutatorsApi } from "../index"
import { AppZeroStore, ZeroLive } from "../live/zero"

// Handler implementation for Zero mutators
export const ZeroHandlerLive = HttpApiBuilder.group(
	ZeroMutatorsApi,
	"zero",
	(handlers) =>
		handlers.handle("push", (input) =>
			Effect.gen(function* () {
				const appZeroStore = yield* AppZeroStore

				// Log the incoming push request with user context
				yield* Effect.log(
					"Processing Zero push request",
					input.payload.mutations,
				)

				const authData = {
					userId: "123",
				}

				// ✅ Process local mutations first (SAME as current)
				const result = yield* appZeroStore
					.processMutations(
						createMutators(authData), // Clean mutators - local only
						input.urlParams,
						// Have to cast it to ReadonlyJSONObject because the PushProcessor expects a JSON object
						input.payload as unknown as ReadonlyJSONObject,
					)
					.pipe(
						Effect.mapError(
							(error) =>
								new MutatorError({
									message: `Error processing push request: ${error}`,
								}),
						),
					)

				console.log(JSON.stringify(input.payload.mutations))

				return result
			}),
		),
).pipe(Layer.provide(ZeroLive))
