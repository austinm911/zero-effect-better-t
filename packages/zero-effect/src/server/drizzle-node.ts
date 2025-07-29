/** biome-ignore-all lint/style/useConsistentArrayType: Zero library uses Array<T> */
/** biome-ignore-all lint/suspicious/noExplicitAny: Zero library types require any */
import type { Primitive } from "@effect/sql/Statement"
import type {
	CustomMutatorDefs,
	ReadonlyJSONObject,
	Schema,
} from "@rocicorp/zero"
import type { DBConnection, DBTransaction, Row } from "@rocicorp/zero/pg"
import { PushProcessor, ZQLDatabase } from "@rocicorp/zero/pg"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { Context, Effect, Layer, type Runtime } from "effect"
import {
	type CustomMutatorEfDefs,
	convertEffectMutatorsToPromise,
} from "../client"
import { ZeroMutationProcessingError } from "../shared/errors"

/**
 * Drizzle implementation of Zero's `DBConnection` interface that can be used with
 * `ZQLDatabase` so all reads / writes go through a Drizzle transaction. This is
 * largely identical to the Pg client implementation but wraps the Drizzle
 * transaction object to satisfy Zero's contract.
 *
 * @since 1.0.0
 */
export class DrizzleConnection<TDrizzle extends NodePgDatabase<any>, R = never>
	implements DBConnection<DrizzleTransactionType<TDrizzle>>
{
	readonly drizzle: TDrizzle
	readonly #runtime: Runtime.Runtime<R>

	constructor(drizzle: TDrizzle, runtime: Runtime.Runtime<R>) {
		this.drizzle = drizzle
		this.#runtime = runtime
	}

	query(sql: string, params: Array<unknown>): Promise<Iterable<Row>> {
		// Drizzle does not expose a direct `query` helper so we fall back to the
		// underlying pg client used by Drizzle.  This gives us raw access to
		// rows just like Zero expects.
		//
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const client = (this.drizzle as any).$client as unknown as {
			query: (
				sql: string,
				params: Array<Primitive>,
			) => Promise<{ rows: Array<Row> }>
		}
		return client.query(sql, params as Array<Primitive>).then((r) => r.rows)
	}

	transaction<TRet>(
		fn: (tx: DBTransaction<DrizzleTransactionType<TDrizzle>>) => Promise<TRet>,
	): Promise<TRet> {
		return this.drizzle.transaction((drizzleTx) => {
			const txAdapter = new DrizzleTransaction(drizzleTx, this.#runtime)
			return fn(txAdapter)
		})
	}
}

/**
 * Helper alias that infers the concrete type Drizzle uses for its callback
 * parameter inside `db.transaction(...)`.
 */
export type DrizzleTransactionType<TDrizzle extends NodePgDatabase<any>> =
	Parameters<Parameters<TDrizzle["transaction"]>[0]>[0]

/**
 * The transaction adapter that fulfills Zero's `DBTransaction` contract while
 * delegating to the wrapped Drizzle transaction object.
 *
 * @since 1.0.0
 */
export class DrizzleTransaction<TDrizzle extends NodePgDatabase<any>, R = never>
	implements DBTransaction<DrizzleTransactionType<TDrizzle>>
{
	readonly wrappedTransaction: DrizzleTransactionType<TDrizzle>

	constructor(
		tx: DrizzleTransactionType<TDrizzle>,
		_runtime: Runtime.Runtime<R>,
	) {
		this.wrappedTransaction = tx
	}

	query(sql: string, params: Array<unknown>): Promise<Iterable<Row>> {
		// Similar to the connection wrapper, dig into the underlying pg client
		// so we can execute arbitrary SQL.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const session = (this.wrappedTransaction as any)._.session as {
			client: {
				query: (
					sql: string,
					params: Array<Primitive>,
				) => Promise<{ rows: Array<Row> }>
			}
		}
		return session.client
			.query(sql, params as Array<Primitive>)
			.then((r) => r.rows)
	}
}

/**
 * Create a ZQL database backed by a Drizzle instance.
 *
 * @since 1.0.0
 */
export function zeroEffectDrizzle<
	TSchema extends Schema,
	TDrizzle extends NodePgDatabase<any>,
	R = never,
>(
	schema: TSchema,
	drizzle: TDrizzle,
	runtime: Runtime.Runtime<R>,
): ZQLDatabase<TSchema, DrizzleTransactionType<TDrizzle>> {
	const connection = new DrizzleConnection(drizzle, runtime)
	return new ZQLDatabase(connection, schema)
}

/**
 * Convenience helper for building a {@link PushProcessor} around a Drizzle
 * connection.
 *
 * @since 1.0.0
 */
export function zeroEffectDrizzleProcessor<
	TSchema extends Schema,
	TDrizzle extends NodePgDatabase<any>,
	R = never,
>(
	schema: TSchema,
	drizzle: TDrizzle,
	runtime: Runtime.Runtime<R>,
): PushProcessor<
	ZQLDatabase<TSchema, DrizzleTransactionType<TDrizzle>>,
	CustomMutatorDefs<TSchema>
> {
	const db = zeroEffectDrizzle(schema, drizzle, runtime)
	return new PushProcessor(db)
}

// -----------------------------------------------------------------------------
// ZeroStore implementation -----------------------------------------------------
// -----------------------------------------------------------------------------

/**
 * Builds a `ZeroStore` implementation for Drizzle-backed databases.  The public
 * surface mirrors `make` from `server.ts` so it can be used interchangeably.
 *
 * @since 1.0.0
 */
export const makeDrizzle = <TDrizzle extends NodePgDatabase<any>>(
	drizzle: TDrizzle,
	runtime: Runtime.Runtime<never>,
): DrizzleZeroStore<TDrizzle> => makeDrizzleStore(drizzle, runtime)

// -----------------------------------------------------------------------------
// Effect Architecture Patterns (matching original/server.ts) -----------------
// -----------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category symbols
 */
export const DrizzleTypeId: unique symbol = Symbol.for(
	"@zero-effect/DrizzleZeroStore",
)

/**
 * @since 1.0.0
 * @category symbols
 */
export type DrizzleTypeId = typeof DrizzleTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const DrizzleZeroSchemaStoreTypeId: unique symbol = Symbol.for(
	"@zero-effect/DrizzleZeroSchemaStore",
)

/**
 * @since 1.0.0
 * @category symbols
 */
export type DrizzleZeroSchemaStoreTypeId = typeof DrizzleZeroSchemaStoreTypeId

/**
 * @since 1.0.0
 * @category models
 * @example
 * ```ts
 * const handler = Effect.gen(function* () {
 *   const drizzleStore = yield* DrizzleZeroStore
 *   const schemaStore = drizzleStore.forSchema(mySchema)
 *
 *   // Process mutations from Zero client
 *   const result = yield* schemaStore.processMutations(
 *     myMutators,
 *     urlParams,
 *     payload
 *   )
 *
 *   return result
 * })
 * ```
 */
export interface DrizzleZeroStore<
	TDrizzle extends NodePgDatabase<any> = NodePgDatabase<any>,
> {
	readonly [DrizzleTypeId]: DrizzleTypeId
	readonly forSchema: <TSchema extends Schema>(
		schema: TSchema,
	) => DrizzleZeroSchemaStore<TSchema, TDrizzle>
}

/**
 * @since 1.0.0
 * @category models
 */
export type DrizzleZeroStoreAnyStore =
	| DrizzleZeroStore<any>
	| DrizzleZeroSchemaStore<any, any>

/**
 * @since 1.0.0
 * @category models
 * @example
 * ```ts
 * const schemaStore = drizzleStore.forSchema(mySchema)
 *
 * // Process mutations
 * const result = yield* schemaStore.processMutations(
 *   myMutators,
 *   urlParams,
 *   mutationPayload
 * )
 * ```
 */
export interface DrizzleZeroSchemaStore<
	TSchema extends Schema,
	TDrizzle extends NodePgDatabase<any> = NodePgDatabase<any>,
> {
	readonly [DrizzleZeroSchemaStoreTypeId]: DrizzleZeroSchemaStoreTypeId
	readonly database: ZQLDatabase<TSchema, DrizzleTransactionType<TDrizzle>>
	readonly processor: PushProcessor<
		ZQLDatabase<TSchema, DrizzleTransactionType<TDrizzle>>,
		CustomMutatorDefs<TSchema>
	>
	readonly processMutations: <R>(
		effectMutators: CustomMutatorEfDefs<TSchema, R>,
		urlParams: Record<string, string>,
		payload: ReadonlyJSONObject,
	) => Effect.Effect<any, ZeroMutationProcessingError, R>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const DrizzleZeroStore: Context.Tag<
	DrizzleZeroStore<any>,
	DrizzleZeroStore<any>
> = Context.GenericTag<DrizzleZeroStore<any>>("@zero-effect/DrizzleZeroStore")

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeDrizzleStore: <TDrizzle extends NodePgDatabase<any>>(
	drizzle: TDrizzle,
	runtime: Runtime.Runtime<never>,
) => DrizzleZeroStore<TDrizzle> = <TDrizzle extends NodePgDatabase<any>>(
	drizzle: TDrizzle,
	runtime: Runtime.Runtime<never>,
): DrizzleZeroStore<TDrizzle> => ({
	[DrizzleTypeId]: DrizzleTypeId,
	forSchema: <TSchema extends Schema>(
		schema: TSchema,
	): DrizzleZeroSchemaStore<TSchema, TDrizzle> => {
		const database = zeroEffectDrizzle(schema, drizzle, runtime)
		const processor = zeroEffectDrizzleProcessor(schema, drizzle, runtime)

		return {
			[DrizzleZeroSchemaStoreTypeId]: DrizzleZeroSchemaStoreTypeId,
			database,
			processor,
			processMutations: <R>(
				effectMutators: CustomMutatorEfDefs<TSchema, R>,
				urlParams: Record<string, string>,
				payload: ReadonlyJSONObject,
			): Effect.Effect<any, ZeroMutationProcessingError, R> => {
				return Effect.gen(function* () {
					const currentRuntime = yield* Effect.runtime<R>()
					const promiseMutators = convertEffectMutatorsToPromise(
						effectMutators,
						currentRuntime,
					)

					return yield* Effect.tryPromise({
						catch: (error) =>
							new ZeroMutationProcessingError({
								cause: error,
								message: `Zero mutation processing failed: ${String(error)}`,
							}),
						try: () =>
							processor.process(promiseMutators as any, urlParams, payload),
					})
				})
			},
		}
	},
})

/**
 * @since 1.0.0
 * @category layers
 */
export const ZeroStoreDrizzleLive = <TDrizzle extends NodePgDatabase<any>>(
	drizzle: TDrizzle,
) =>
	Layer.effect(
		DrizzleZeroStore,
		Effect.gen(function* () {
			const runtime = yield* Effect.runtime<never>()
			return makeDrizzleStore(drizzle, runtime)
		}),
	)
