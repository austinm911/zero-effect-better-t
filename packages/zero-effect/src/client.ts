/** biome-ignore-all lint/style/useConsistentArrayType: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/**
 * @since 1.0.0
 */

import type {
	CustomMutatorDefs,
	SchemaQuery,
	Transaction,
	Schema as ZeroSchema,
} from "@rocicorp/zero"
import { Effect, Runtime } from "effect"
import {
	ZeroMutationProcessingError,
	ZeroMutatorAuthError,
	ZeroMutatorDatabaseError,
	ZeroMutatorValidationError,
} from "./shared/errors"

// Re-export error types for convenience
export {
	ZeroMutatorDatabaseError,
	ZeroMutatorAuthError,
	ZeroMutatorValidationError,
	ZeroMutationProcessingError,
}

/**
 * @since 1.0.0
 * @category models
 */
export type CustomMutatorEfDefs<TSchema extends ZeroSchema, R = unknown> = {
	[TableName in keyof TSchema["tables"]]?: {
		[MutatorName: string]: (
			tx: EffectTransaction<TSchema>,
			...args: ReadonlyArray<any>
		) => Effect.Effect<any, any, R>
	}
}

/**
 * @since 1.0.0
 * @category models
 */
type SchemaCRUD<S extends ZeroSchema> = {
	[Table in keyof S["tables"]]: {
		insert: (value: any) => Promise<void>
		upsert: (value: any) => Promise<void>
		update: (value: any) => Promise<void>
		delete: (id: any) => Promise<void>
	}
}

/**
 * @since 1.0.0
 * @category models
 */
type EffectSchemaCRUD<TSchema extends ZeroSchema> = {
	[K in keyof TSchema["tables"]]: {
		[Method in keyof SchemaCRUD<TSchema>[K]]: SchemaCRUD<TSchema>[K][Method] extends (
			...args: infer Args
		) => Promise<infer R>
			? (...args: Args) => Effect.Effect<R, ZeroMutatorDatabaseError>
			: never
	}
}

/**
 * @since 1.0.0
 * @category models
 */
type EffectSchemaQuery<TSchema extends ZeroSchema> = SchemaQuery<TSchema>

/**
 * @since 1.0.0
 * @category models
 * @example
 * ```ts
 * const updatePerson = (tx: EffectTransaction<Schema>, input: UpdateInput) =>
 *   Effect.gen(function* () {
 *     // Mutations return Effects that can fail with ZeroMutatorDatabaseError
 *     yield* tx.mutate.people.update({ id: input.id, name: input.name })
 *
 *     // Queries also return Effects
 *     const person = yield* tx.query.people.where('id', input.id).first()
 *
 *     return person
 *   })
 * ```
 */
export class EffectTransaction<TSchema extends ZeroSchema> {
	readonly tx: Transaction<TSchema>

	constructor(tx: Transaction<TSchema>) {
		this.tx = tx
	}

	// Add missing properties required by ClientTransaction
	get location() {
		return this.tx.location
	}

	get reason() {
		return this.tx.reason
	}

	get clientID() {
		return this.tx.clientID
	}

	get mutationID() {
		return this.tx.mutationID
	}

	get mutate(): EffectSchemaCRUD<TSchema> {
		return this.createMutateProxy(this.tx.mutate) as EffectSchemaCRUD<TSchema>
	}

	get query(): EffectSchemaQuery<TSchema> {
		return this.createQueryProxy(this.tx.query) as EffectSchemaQuery<TSchema>
	}

	private createMutateProxy(mutate: any): any {
		return new Proxy(mutate, {
			get: (target, prop) => {
				const value = target[prop]
				if (typeof value === "object" && value !== null) {
					return this.createMutateProxy(value)
				}
				if (typeof value === "function") {
					return (...args: Array<any>) =>
						Effect.tryPromise({
							catch: (error) =>
								new ZeroMutatorDatabaseError({
									cause: error,
									message: `Database mutation failed: ${String(error)}`,
								}),
							try: () => value.apply(target, args),
						})
				}
				return value
			},
		})
	}

	private createQueryProxy(query: any): any {
		return new Proxy(query, {
			get: (target, prop) => {
				const value = target[prop]
				if (typeof value === "object" && value !== null) {
					return this.createQueryProxy(value)
				}
				if (typeof value === "function") {
					return (...args: Array<any>) =>
						Effect.tryPromise({
							catch: (error) =>
								new ZeroMutatorDatabaseError({
									cause: error,
									message: `Database query failed: ${String(error)}`,
								}),
							try: () => value.apply(target, args),
						})
				}
				return value
			},
		})
	}
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const createEffectTransaction = <TSchema extends ZeroSchema>(
	tx: Transaction<TSchema>,
) => new EffectTransaction(tx)

/**
 * @since 1.0.0
 * @category models
 */
type EffectMutators<_TSchema extends ZeroSchema, R = unknown> = Record<
	string,
	| Record<string, (tx: any, ...args: Array<any>) => Effect.Effect<any, any, R>>
	| undefined
>

/**
 * @since 1.0.0
 * @category converters
 * @example
 * ```ts
 * // Client usage
 * const clientMutators = convertEffectMutatorsToPromise(
 *   effectMutators,
 *   Runtime.defaultRuntime
 * )
 *
 * // Server usage with custom runtime
 * const serverRuntime = Runtime.defaultRuntime.pipe(
 *   Runtime.provideService(MyService, myServiceImpl)
 * )
 * const serverMutators = convertEffectMutatorsToPromise(
 *   effectMutators,
 *   serverRuntime
 * )
 * ``` */
export function convertEffectMutatorsToPromise<TSchema extends ZeroSchema, R>(
	effectMutators: EffectMutators<TSchema, R>,
	runtime: Runtime.Runtime<R>,
): CustomMutatorDefs<TSchema> {
	const promiseMutators: Record<string, Record<string, any>> = {}

	for (const [tableName, tableMutators] of Object.entries(effectMutators)) {
		if (tableMutators) {
			promiseMutators[tableName] = {}

			for (const [mutatorName, mutatorFn] of Object.entries(tableMutators)) {
				if (typeof mutatorFn === "function") {
					promiseMutators[tableName][mutatorName] = async (
						tx: Transaction<TSchema>,
						...args: ReadonlyArray<any>
					) => {
						const effectTx = createEffectTransaction(tx)
						const effect = mutatorFn(effectTx, ...args)
						return await Runtime.runPromise(runtime)(effect)
					}
				}
			}
		}
	}

	return promiseMutators as CustomMutatorDefs<TSchema>
}
