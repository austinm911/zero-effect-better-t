import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

// Error schemas
export class MutatorError extends Schema.TaggedError<MutatorError>()(
	"MutatorError",
	{
		message: Schema.String,
		mutationId: Schema.String.pipe(Schema.optional),
	},
) {}

// CRUD operation schemas
export const PrimaryKey = Schema.Record({
	key: Schema.String,
	value: Schema.Unknown,
})
export type PrimaryKey = typeof PrimaryKey.Type

export const RowValue = Schema.Record({
	key: Schema.String,
	value: Schema.Unknown,
})
export type RowValue = typeof RowValue.Type

export const InsertOp = Schema.Struct({
	op: Schema.Literal("insert"),
	primaryKey: PrimaryKey,
	tableName: Schema.String,
	value: RowValue,
})
export type InsertOp = typeof InsertOp.Type

export const UpsertOp = Schema.Struct({
	op: Schema.Literal("upsert"),
	primaryKey: PrimaryKey,
	tableName: Schema.String,
	value: RowValue,
})
export type UpsertOp = typeof UpsertOp.Type

export const UpdateOp = Schema.Struct({
	op: Schema.Literal("update"),
	primaryKey: PrimaryKey,
	tableName: Schema.String,
	value: RowValue,
})
export type UpdateOp = typeof UpdateOp.Type

export const DeleteOp = Schema.Struct({
	op: Schema.Literal("delete"),
	primaryKey: PrimaryKey,
	tableName: Schema.String,
	value: PrimaryKey, // For delete ops, value represents the primary key
})
export type DeleteOp = typeof DeleteOp.Type

export const CRUDOp = Schema.Union(InsertOp, UpsertOp, UpdateOp, DeleteOp)
export type CRUDOp = typeof CRUDOp.Type

export const CRUDMutationArg = Schema.Struct({
	ops: Schema.Array(CRUDOp),
})

export const CRUDMutation = Schema.Struct({
	args: Schema.Tuple(CRUDMutationArg),
	clientID: Schema.String,
	id: Schema.Number,
	name: Schema.Literal("_zero_crud"),
	timestamp: Schema.Number,
	type: Schema.Literal("crud"),
})
export type CRUDMutation = typeof CRUDMutation.Type

export const CustomMutation = Schema.Struct({
	args: Schema.Array(Schema.Unknown),
	clientID: Schema.String,
	id: Schema.Number,
	name: Schema.String,
	timestamp: Schema.Number, // JSON values
	type: Schema.Literal("custom"),
})
export type CustomMutation = typeof CustomMutation.Type

export const Mutation = Schema.Union(CRUDMutation, CustomMutation)
export type Mutation = typeof Mutation.Type

export const PushRequest = Schema.Struct({
	clientGroupID: Schema.String,
	mutations: Schema.Array(Mutation),
	pushVersion: Schema.Number,
	requestID: Schema.String, // For legacy CRUD mutations
	schemaVersion: Schema.Number.pipe(Schema.optional),
	timestamp: Schema.Number,
})
export type PushRequest = typeof PushRequest.Type

export const PushUrlParams = Schema.Struct({
	appID: Schema.String,
	schema: Schema.String,
})

// Define the Zero custom mutators HTTP API group
export const ZeroMutatorsGroup = HttpApiGroup.make("zero").add(
	HttpApiEndpoint.post("push", "/push")
		.setUrlParams(PushUrlParams)
		.setPayload(PushRequest)
		.addError(MutatorError),
)

// Define the complete HTTP API
export class ZeroMutatorsApi extends HttpApi.make("zero")
	.add(ZeroMutatorsGroup)
	.prefix("/api") {}
