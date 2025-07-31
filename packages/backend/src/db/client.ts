import * as Pg from "@effect/sql-drizzle/Pg"
import { PgClient } from "@effect/sql-pg"
import { env } from "@zero-effect/env/server"
import type { DrizzleConfig } from "drizzle-orm"
import { Effect, Layer } from "effect"
import * as schema from "./schema"

const connectionConfig: PgClient.PgClientConfig = {
	url: env.DATABASE_URL,
	maxConnections: 20,
	idleTimeout: "30 seconds" as const,
	connectTimeout: "2 seconds" as const,
}

const drizzleConfig: DrizzleConfig<typeof schema> = {
	schema,
	casing: "snake_case",
	logger: true,
}

const PgClientLive = PgClient.layer(connectionConfig)

const DrizzleClientLive = Pg.layerWithConfig({
	...drizzleConfig,
	// @ts-expect-error
	schema: drizzleConfig.schema,
}).pipe(Layer.provide(PgClientLive))

export const DBLive = Layer.mergeAll(PgClientLive, DrizzleClientLive)

export class Database extends Effect.Service<Database>()(
	"@zero-effect/backend/Drizzle",
	{
		effect: Pg.make(drizzleConfig),
	},
) {
	// Layer.Layer<PgClient.PgClient | SqlClient | Pg.PgDrizzle | Database, ConfigError | SqlError, never>
	static Live = this.Default.pipe(Layer.provideMerge(DBLive))
}
