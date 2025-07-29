/**
 * Shared types for zero-effect Drizzle implementations
 * @since 1.0.0
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import type { ReadonlyJSONObject, Schema } from "@rocicorp/zero"
import type { Effect } from "effect"
import type { CustomMutatorEfDefs, EffectTransaction } from "../client"
import type { ZeroMutationProcessingError } from "./errors"

/**
 * @since 1.0.0
 * @category models
 */
export interface ZeroSchemaStore<TSchema extends Schema> {
	readonly processMutations: <R>(
		effectMutators: CustomMutatorEfDefs<TSchema, R>,
		urlParams: Record<string, string>,
		payload: ReadonlyJSONObject,
	) => Effect.Effect<any, ZeroMutationProcessingError, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ZeroStore {
	readonly forSchema: <TSchema extends Schema>(
		schema: TSchema,
	) => ZeroSchemaStore<TSchema>
}

/**
 * @since 1.0.0
 * @category models
 */
export type MutatorFunction<
	TSchema extends Schema,
	TInput = any,
	TOutput = any,
	R = never,
> = (
	tx: EffectTransaction<TSchema>,
	input: TInput,
) => Effect.Effect<TOutput, any, R>

/**
 * @since 1.0.0
 * @category models
 */
export type TableMutators<TSchema extends Schema, R = never> = {
	[MutatorName: string]: MutatorFunction<TSchema, any, any, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export type SchemaMutators<TSchema extends Schema, R = never> = {
	[TableName in keyof TSchema["tables"]]?: TableMutators<TSchema, R>
}
