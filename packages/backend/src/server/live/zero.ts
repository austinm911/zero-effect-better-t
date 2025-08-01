import {
	type ZeroSchemaStore,
	ZeroStore,
	ZeroStoreLive,
} from "@zero-effect/zero-effect/server/pg"
import { Context, Effect, Layer } from "effect"
import { schema } from "../../zero"

/**
 * Schema-specific Zero store tag for the application schema
 */
export class AppZeroStore extends Context.Tag(
	"@zero-effect/server/AppZeroStore",
)<AppZeroStore, ZeroSchemaStore<typeof schema>>() {}

/**
 * Live implementation that creates a schema-specific Zero store
 */
export const AppZeroStoreLive = Layer.effect(
	AppZeroStore,
	Effect.gen(function* () {
		const zeroStore = yield* ZeroStore
		return zeroStore.forSchema(schema)
	}),
)

/**
 * Combined layer that provides the schema-specific Zero store
 */
export const ZeroLive = Layer.provide(AppZeroStoreLive, ZeroStoreLive)
