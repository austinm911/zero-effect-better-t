/**
 * Shared test utilities for Drizzle zero-effect integration tests
 *
 * This file provides consolidated setup helpers, test data, and utilities
 * to reduce duplication across drizzle test files.
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { expect } from "bun:test"
import { createSchema, string, table } from "@rocicorp/zero"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import { Context, Effect, Runtime } from "effect"
import type { CustomMutatorEfDefs, EffectTransaction } from "../src/client"
import { makeDrizzle } from "../src/server/drizzle-node"

// ===== MOCK DRIZZLE DATABASE =====

/**
 * Creates a mock NodePgDatabase for testing
 */
export const createMockDrizzle = () =>
	({
		$client: {
			query: (_sql: string, _params: unknown[]) =>
				Promise.resolve({
					rows: [
						{
							email: "test@example.com",
							id: "1",
							name: "Test User",
						},
					],
				}),
		},
		transaction: (fn: (tx: any) => Promise<any>) => {
			const mockTx = {
				_: {
					session: {
						client: {
							query: (_sql: string, _params: unknown[]) =>
								Promise.resolve({
									rows: [
										{
											email: "test@example.com",
											id: "1",
											name: "Test User",
										},
									],
								}),
						},
					},
				},
			}
			return fn(mockTx)
		},
	}) as unknown as NodePgDatabase<any>

/**
 * Creates a failing mock Drizzle database for error testing
 */
export const createFailingDrizzle = () =>
	({
		$client: {
			query: () => Promise.reject(new Error("Drizzle connection failed")),
		},
		transaction: () => Promise.reject(new Error("Drizzle transaction failed")),
	}) as unknown as NodePgDatabase<any>

/**
 * Creates a mock that returns empty results
 */
export const createEmptyDrizzle = () =>
	({
		$client: {
			query: (_sql: string, _params: unknown[]) =>
				Promise.resolve({ rows: [] }),
		},
		transaction: (fn: (tx: any) => Promise<any>) => {
			const mockTx = {
				_: {
					session: {
						client: {
							query: (_sql: string, _params: unknown[]) =>
								Promise.resolve({ rows: [] }),
						},
					},
				},
			}
			return fn(mockTx)
		},
	}) as unknown as NodePgDatabase<any>

// ===== DRIZZLE SERVICE TAG =====

/**
 * Effect service tag for Drizzle database (for testing with layers)
 */
export const DrizzleService = Context.GenericTag<NodePgDatabase<any>>(
	"@zero-effect/DrizzleService",
)

// ===== MOCK SCHEMA =====

/**
 * Mock Zero schema for testing (matches original/server.test.ts)
 */
const groups = table("groups")
	.columns({
		id: string(),
		name: string(),
		description: string(),
	})
	.primaryKey("id")

const people = table("people")
	.columns({
		id: string(),
		name: string(),
		email: string(),
	})
	.primaryKey("id")

export const mockSchema = createSchema({
	tables: [groups, people],
})

/**
 * Minimal test schema for edge case testing
 */
export const minimalSchema = {
	tables: {
		items: {
			columns: { id: { type: "string" } },
			primaryKey: ["id"],
		},
	},
} as any

// ===== SETUP HELPERS =====

/**
 * Creates a complete drizzle test setup with all necessary components
 */
export const createDrizzleTestSetup = () => {
	const mockDrizzle = createMockDrizzle()
	const runtime = Runtime.defaultRuntime
	const drizzleStore = makeDrizzle(mockDrizzle, runtime)
	const schemaStore = drizzleStore.forSchema(mockSchema)

	return {
		mockDrizzle,
		runtime,
		drizzleStore,
		schemaStore,
	}
}

/**
 * Creates test setup with failing drizzle for error testing
 */
export const createFailingDrizzleTestSetup = () => {
	const failingDrizzle = createFailingDrizzle()
	const runtime = Runtime.defaultRuntime
	const drizzleStore = makeDrizzle(failingDrizzle, runtime)
	const schemaStore = drizzleStore.forSchema(mockSchema)

	return {
		failingDrizzle,
		runtime,
		drizzleStore,
		schemaStore,
	}
}

/**
 * Creates test setup with minimal schema
 */
export const createMinimalTestSetup = () => {
	const mockDrizzle = createMockDrizzle()
	const runtime = Runtime.defaultRuntime
	const drizzleStore = makeDrizzle(mockDrizzle, runtime)
	const schemaStore = drizzleStore.forSchema(minimalSchema)

	return {
		mockDrizzle,
		runtime,
		drizzleStore,
		schemaStore,
		schema: minimalSchema,
	}
}

// ===== TEST MUTATORS =====

/**
 * Creates test mutators for successful operations
 */
export const createTestMutators = (): CustomMutatorEfDefs<any> => ({
	groups: {
		createGroup: (
			_tx: EffectTransaction<any>,
			input: { name: string; description?: string },
		) =>
			Effect.gen(function* () {
				yield* Effect.log("Creating group with Drizzle", {
					name: input.name,
				})
				return { id: "new_group_123", ...input }
			}),
	},
	people: {
		createPerson: (
			_tx: EffectTransaction<any>,
			input: { name: string; email?: string },
		) =>
			Effect.gen(function* () {
				yield* Effect.log("Creating person with Drizzle", {
					name: input.name,
				})
				return { id: "new_person_123", ...input }
			}),

		updatePerson: (
			_tx: EffectTransaction<any>,
			input: { id: string; name?: string; email?: string },
		) =>
			Effect.gen(function* () {
				yield* Effect.log("Updating person with Drizzle", {
					id: input.id,
				})
				return { ...input }
			}),
	},
})

/**
 * Creates test mutators that fail for error testing
 */
export const createFailingMutators = (): CustomMutatorEfDefs<any> => ({
	people: {
		createPerson: () => Effect.fail(new Error("Drizzle mutator failed")),
	},
})

/**
 * Creates complex mutators for runtime context testing
 */
export const createRuntimeMutators = (): CustomMutatorEfDefs<any> => ({
	people: {
		runtimeTest: () =>
			Effect.gen(function* () {
				const runtime = yield* Effect.runtime()
				return { hasRuntime: !!runtime, success: true }
			}),
	},
})

// ===== TEST PAYLOADS =====

/**
 * Standard mutation payload for testing
 */
export const createTestPayload = () => ({
	mutations: [
		{
			args: [{ email: "john@example.com", name: "John Doe" }],
			id: 1,
			name: "people.createPerson",
		},
	],
})

/**
 * Multiple mutations payload for batch testing
 */
export const createMultiplePayload = () => ({
	mutations: [
		{
			args: [{ name: "Person 1", email: "person1@example.com" }],
			id: 1,
			name: "people.createPerson",
		},
		{
			args: [{ name: "Group 1", description: "Test Group" }],
			id: 2,
			name: "groups.createGroup",
		},
	],
})

/**
 * Empty mutation payload for edge case testing
 */
export const createEmptyPayload = () => ({
	mutations: [],
})

/**
 * Malformed payload for error testing
 */
export const createMalformedPayload = () => ({
	invalid: "payload",
})

/**
 * Standard URL params for testing
 */
export const createTestUrlParams = () => ({
	clientID: "test-client",
})

// ===== ASSERTION HELPERS =====

/**
 * Helper to check if a result is either success or failure
 */
export const isEitherResult = (result: any): boolean => {
	return result._tag === "Left" || result._tag === "Right"
}

/**
 * Helper to check if an error result has expected message
 */
export const isErrorResult = (
	result: any,
	expectedMessage: string,
): boolean => {
	return result._tag === "Left" && result.left?.message === expectedMessage
}

/**
 * Helper to verify store interface compliance
 */
export const verifyStoreInterface = (store: any) => {
	expect(store).toBeDefined()
	expect(typeof store.forSchema).toBe("function")
}

/**
 * Helper to verify schema store interface compliance
 */
export const verifySchemaStoreInterface = (schemaStore: any) => {
	expect(schemaStore).toBeDefined()
	expect(schemaStore.database).toBeDefined()
	expect(schemaStore.processor).toBeDefined()
	expect(typeof schemaStore.processMutations).toBe("function")
}

/**
 * Helper to verify mutation processing result
 */
export const verifyMutationResult = (result: any) => {
	expect(isEitherResult(result)).toBe(true)
}

// ===== TEST EXECUTION HELPERS =====

/**
 * Standard mutation processing test with the given setup
 */
export const runMutationTest = (
	schemaStore: any,
	mutators: any = createTestMutators(),
	payload: any = createTestPayload(),
) =>
	Effect.gen(function* () {
		const urlParams = createTestUrlParams()
		const result = yield* schemaStore
			.processMutations(mutators, urlParams, payload)
			.pipe(Effect.either)
		verifyMutationResult(result)
		return result
	})

/**
 * Error handling test with failing setup
 */
export const runErrorTest = (
	schemaStore: any,
	mutators: any = createFailingMutators(),
	payload: any = createTestPayload(),
) =>
	Effect.gen(function* () {
		const urlParams = createTestUrlParams()
		const result = yield* schemaStore
			.processMutations(mutators, urlParams, payload)
			.pipe(Effect.either)
		expect(isEitherResult(result)).toBe(true)
		return result
	})

// ===== EXPORT ORGANIZATION =====

// Note: Each test file should import 'expect' directly from 'bun:test'
