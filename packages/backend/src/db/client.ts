import * as Pg from "@effect/sql-drizzle/Pg"
import { PgClient } from "@effect/sql-pg"
import { env } from "@zero-effect/env/server"
import { Effect, Layer } from "effect"
import * as schema from "./schema"

const connectionConfig: PgClient.PgClientConfig = {
	url: env.DATABASE_URL,
	maxConnections: 20,
	idleTimeout: "30 seconds" as const,
	connectTimeout: "2 seconds" as const,
}

// Effect PgClient layer (used by Zero-Effect and Effect SQL)
const PgClientLive = PgClient.layer(connectionConfig)

export class Drizzle extends Effect.Service<Drizzle>()(
	"@zero-effect/backend/Drizzle",
	{
		effect: Pg.make({
			schema,
			casing: "snake_case",
			// @ts-expect-error - Effect omits logger from the type
			logger: true,
		}),
	},
) {
	static Client = this.Default.pipe(Layer.provideMerge(PgClientLive))
}
