/**
 * @important Run this with `bun test <filename>`
 *
 * Consolidated Drizzle Zero Effect tests
 *
 * This file contains all essential tests for the Drizzle zero-effect adapter,
 * consolidating functionality from multiple test files to reduce duplication.
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/suspicious/noMisplacedAssertion: <> */
/** biome-ignore-all lint/correctness/useYield: <> */

import { expect } from "bun:test"
import { Effect, Layer, Runtime } from "effect"
import { effect, layer } from "../../effect-bun-test/src"
import {
	DrizzleConnection,
	DrizzleTransaction,
	DrizzleZeroStore,
	makeDrizzle,
	ZeroStoreDrizzleLive,
	zeroEffectDrizzle,
	zeroEffectDrizzleProcessor,
} from "../src/server/drizzle-node"
import { ZeroMutationProcessingError } from "../src/shared/errors"
import {
	createDrizzleTestSetup,
	createEmptyPayload,
	createFailingDrizzleTestSetup,
	createFailingMutators,
	createMalformedPayload,
	createMinimalTestSetup,
	createMultiplePayload,
	createRuntimeMutators,
	createTestMutators,
	createTestPayload,
	DrizzleService,
	mockSchema,
	runErrorTest,
	runMutationTest,
	verifySchemaStoreInterface,
	verifyStoreInterface,
} from "./drizzle-test-utils"

// ===== CORE ADAPTER TESTS =====

effect("DrizzleConnection should work correctly", () =>
	Effect.gen(function* () {
		const { mockDrizzle } = createDrizzleTestSetup()
		const connection = new DrizzleConnection(
			mockDrizzle,
			Runtime.defaultRuntime,
		)

		expect(connection).toBeInstanceOf(DrizzleConnection)
		expect(connection.drizzle).toBe(mockDrizzle)
		expect(typeof connection.transaction).toBe("function")
		expect(typeof connection.query).toBe("function")

		// Test query functionality
		const queryResult = yield* Effect.promise(() =>
			connection.query("SELECT * FROM people", []),
		)
		expect(Array.from(queryResult)).toHaveLength(1)
		expect(Array.from(queryResult)[0]?.name).toBe("Test User")

		// Test transaction functionality
		const txResult = yield* Effect.promise(() =>
			connection.transaction(async (tx) => {
				expect(tx).toBeInstanceOf(DrizzleTransaction)
				const result = await tx.query("SELECT * FROM people", [])
				return Array.from(result)
			}),
		)
		expect(txResult).toHaveLength(1)
		expect(txResult[0]?.name).toBe("Test User")
	}),
)

effect("DrizzleConnection should handle errors", () =>
	Effect.gen(function* () {
		const { failingDrizzle } = createFailingDrizzleTestSetup()
		const connection = new DrizzleConnection(
			failingDrizzle,
			Runtime.defaultRuntime,
		)

		// Test query failure
		const queryResult = yield* Effect.tryPromise({
			catch: (error) => error as Error,
			try: () => connection.query("SELECT * FROM people", []),
		}).pipe(Effect.either)

		expect(queryResult._tag).toBe("Left")
		if (queryResult._tag === "Left") {
			expect(queryResult.left.message).toBe("Drizzle connection failed")
		}

		// Test transaction failure
		const txResult = yield* Effect.tryPromise({
			catch: (error) => error as Error,
			try: () => connection.transaction(async () => ({})),
		}).pipe(Effect.either)

		expect(txResult._tag).toBe("Left")
		if (txResult._tag === "Left") {
			expect(txResult.left.message).toBe("Drizzle transaction failed")
		}
	}),
)

// ===== FACTORY FUNCTION TESTS =====

effect("Factory functions should work correctly", () =>
	Effect.gen(function* () {
		const { mockDrizzle, runtime } = createDrizzleTestSetup()

		// Test zeroEffectDrizzle
		const database = zeroEffectDrizzle(
			{
				tables: {
					test: { columns: { id: { type: "string" } }, primaryKey: ["id"] },
				},
			},
			mockDrizzle,
			runtime,
		)
		expect(database).toBeDefined()

		// Test zeroEffectDrizzleProcessor
		const processor = zeroEffectDrizzleProcessor(
			{
				tables: {
					test: { columns: { id: { type: "string" } }, primaryKey: ["id"] },
				},
			},
			mockDrizzle,
			runtime,
		)
		expect(processor).toBeDefined()
		expect(typeof processor.process).toBe("function")

		// Test makeDrizzle
		const store = makeDrizzle(mockDrizzle, runtime)
		verifyStoreInterface(store)
	}),
)

// ===== STORE INTERFACE TESTS =====

effect("DrizzleZeroStore should have correct interface", () =>
	Effect.gen(function* () {
		const { drizzleStore, schemaStore } = createDrizzleTestSetup()

		// Test store interface
		verifyStoreInterface(drizzleStore)

		// Test schema store interface
		verifySchemaStoreInterface(schemaStore)

		// Test that forSchema creates consistent stores
		const schemaStore2 = drizzleStore.forSchema({
			tables: {
				test: { columns: { id: { type: "string" } }, primaryKey: ["id"] },
			},
		})
		verifySchemaStoreInterface(schemaStore2)
	}),
)

// ===== MUTATION PROCESSING TESTS =====

effect("Basic mutation processing should work", () =>
	Effect.gen(function* () {
		const { schemaStore } = createDrizzleTestSetup()
		yield* runMutationTest(schemaStore)
	}),
)

effect("Mutation processing should handle errors", () =>
	Effect.gen(function* () {
		const { schemaStore } = createDrizzleTestSetup()
		yield* runErrorTest(schemaStore)
	}),
)

effect("Mutation processing should handle edge cases", () =>
	Effect.gen(function* () {
		const { schemaStore } = createDrizzleTestSetup()
		const mutators = createTestMutators()

		// Test empty payload
		yield* runMutationTest(schemaStore, mutators, createEmptyPayload())

		// Test malformed payload
		yield* runMutationTest(schemaStore, mutators, createMalformedPayload())

		// Test multiple mutations
		yield* runMutationTest(schemaStore, mutators, createMultiplePayload())
	}),
)

effect("Mutation processing should handle runtime context", () =>
	Effect.gen(function* () {
		const { schemaStore } = createDrizzleTestSetup()
		const runtimeMutators = createRuntimeMutators()
		const payload = {
			mutations: [
				{
					args: [{ name: "Runtime Test" }],
					id: 1,
					name: "people.runtimeTest",
				},
			],
		}

		yield* runMutationTest(schemaStore, runtimeMutators, payload)
	}),
)

// ===== ERROR HANDLING TESTS =====

effect("ZeroMutationProcessingError should work correctly", () =>
	Effect.gen(function* () {
		const originalError = new Error("Test error")
		const error = new ZeroMutationProcessingError({
			cause: originalError,
			message: "Zero mutation processing failed",
		})

		expect(error._tag).toBe("ZeroMutationProcessingError")
		expect(error.cause).toBe(originalError)
		expect(error.message).toBe("Zero mutation processing failed")
		expect(error instanceof Error).toBe(true)
	}),
)

// ===== TYPE SAFETY AND SYMBOLS TESTS =====

effect("TypeId symbols should be defined correctly", () =>
	Effect.gen(function* () {
		// Test that symbols are exported and have correct values
		const drizzleModule = yield* Effect.promise(
			() => import("../src/server/drizzle-node"),
		)
		const { DrizzleTypeId, DrizzleZeroSchemaStoreTypeId } = drizzleModule as any

		expect(typeof DrizzleTypeId).toBe("symbol")
		expect(DrizzleTypeId.toString()).toBe(
			"Symbol(@zero-effect/DrizzleZeroStore)",
		)

		expect(typeof DrizzleZeroSchemaStoreTypeId).toBe("symbol")
		expect(DrizzleZeroSchemaStoreTypeId.toString()).toBe(
			"Symbol(@zero-effect/DrizzleZeroSchemaStore)",
		)

		// Test that stores have proper TypeId
		const { drizzleStore, schemaStore } = createDrizzleTestSetup()
		expect((drizzleStore as any)[DrizzleTypeId]).toBe(DrizzleTypeId)
		expect((schemaStore as any)[DrizzleZeroSchemaStoreTypeId]).toBe(
			DrizzleZeroSchemaStoreTypeId,
		)
	}),
)

effect("Context tags should work correctly", () =>
	Effect.gen(function* () {
		const { DrizzleZeroStore } = yield* Effect.promise(() =>
			import("../src/server/drizzle-node").then((mod) => ({
				DrizzleZeroStore: (mod as any).DrizzleZeroStore,
			})),
		)

		expect(DrizzleZeroStore).toBeDefined()
		expect(typeof DrizzleZeroStore).toBe("object")
		expect(DrizzleZeroStore.key).toBe("@zero-effect/DrizzleZeroStore")
	}),
)

// ===== INTEGRATION TESTS =====

effect("Complete integration should work", () =>
	Effect.gen(function* () {
		const { drizzleStore, schemaStore } = createDrizzleTestSetup()

		// Test that all components work together
		verifyStoreInterface(drizzleStore)
		verifySchemaStoreInterface(schemaStore)

		// Test mutation processing with different scenarios
		const mutators = createTestMutators()

		// Basic processing
		yield* runMutationTest(schemaStore, mutators, createTestPayload())

		// Multiple mutations
		yield* runMutationTest(schemaStore, mutators, createMultiplePayload())

		// Empty mutations
		yield* runMutationTest(schemaStore, mutators, createEmptyPayload())

		// Verify store remains functional after processing
		verifySchemaStoreInterface(schemaStore)
	}),
)

effect("Different schema configurations should work", () =>
	Effect.gen(function* () {
		const { schemaStore, schema } = createMinimalTestSetup()

		// Test with minimal schema
		verifySchemaStoreInterface(schemaStore)

		// Simple mutators for minimal schema
		const minimalMutators = {
			items: {
				createItem: () => Effect.succeed({ id: "test-item" }),
			},
		}

		const minimalPayload = {
			mutations: [{ args: [{ id: "item1" }], id: 1, name: "items.createItem" }],
		}

		yield* runMutationTest(schemaStore, minimalMutators, minimalPayload)
	}),
)

// ===== CONSISTENCY TESTS =====

effect("Store creation should be consistent", () =>
	Effect.gen(function* () {
		const { mockDrizzle, runtime } = createDrizzleTestSetup()

		// Create multiple stores
		const store1 = makeDrizzle(mockDrizzle, runtime)
		const store2 = makeDrizzle(mockDrizzle, runtime)

		// Both should have the same interface
		verifyStoreInterface(store1)
		verifyStoreInterface(store2)

		// Schema stores should be consistent too
		const schema = {
			tables: {
				test: { columns: { id: { type: "string" } }, primaryKey: ["id"] },
			},
		}
		const schemaStore1 = store1.forSchema(schema)
		const schemaStore2 = store2.forSchema(schema)

		verifySchemaStoreInterface(schemaStore1)
		verifySchemaStoreInterface(schemaStore2)
	}),
)

effect("Mutation processing should be deterministic", () =>
	Effect.gen(function* () {
		const { schemaStore } = createDrizzleTestSetup()
		const mutators = createTestMutators()
		const payload = createTestPayload()

		// Run the same processing multiple times
		const result1 = yield* runMutationTest(schemaStore, mutators, payload)
		const result2 = yield* runMutationTest(schemaStore, mutators, payload)

		// Results should have the same structure
		expect(result1._tag).toBe(result2._tag)
	}),
)

// ===== LAYER TESTS (matching original server.test.ts patterns) =====

// Mock Drizzle layer for testing
const MockDrizzleLive = Layer.succeed(
	DrizzleService,
	createDrizzleTestSetup().mockDrizzle,
)

layer(MockDrizzleLive)("ZeroStoreDrizzleLive layer should work", (it) => {
	it.effect("should provide DrizzleZeroStore service", () =>
		Effect.gen(function* () {
			const mockDrizzle = createDrizzleTestSetup().mockDrizzle
			const drizzleZeroStore = yield* DrizzleZeroStore.pipe(
				Effect.provide(ZeroStoreDrizzleLive(mockDrizzle)),
			)

			expect(drizzleZeroStore).toBeDefined()
			verifyStoreInterface(drizzleZeroStore)
		}),
	)

	it.effect("should create schema store from layer", () =>
		Effect.gen(function* () {
			const mockDrizzle = createDrizzleTestSetup().mockDrizzle
			const drizzleZeroStore = yield* DrizzleZeroStore.pipe(
				Effect.provide(ZeroStoreDrizzleLive(mockDrizzle)),
			)
			const schemaStore = drizzleZeroStore.forSchema(mockSchema)

			verifySchemaStoreInterface(schemaStore)
		}),
	)

	it.effect("should support mutation processing through layer", () =>
		Effect.gen(function* () {
			const mockDrizzle = createDrizzleTestSetup().mockDrizzle
			const drizzleZeroStore = yield* DrizzleZeroStore.pipe(
				Effect.provide(ZeroStoreDrizzleLive(mockDrizzle)),
			)
			const schemaStore = drizzleZeroStore.forSchema(mockSchema)

			// Test mutation processing through layer
			yield* runMutationTest(schemaStore)
		}),
	)
})

// ===== CONTEXT TAG TESTS (matching original patterns) =====

effect("DrizzleZeroStore context tag should work correctly", () =>
	Effect.gen(function* () {
		// Test that the context tag is properly defined
		expect(DrizzleZeroStore).toBeDefined()
		expect(typeof DrizzleZeroStore).toBe("object")

		// The tag should have the correct key
		expect(DrizzleZeroStore.key).toBe("@zero-effect/DrizzleZeroStore")
	}),
)

// ===== LAYER INTEGRATION TESTS =====

effect("ZeroStoreDrizzleLive layer should be properly defined", () =>
	Effect.gen(function* () {
		const mockDrizzle = createDrizzleTestSetup().mockDrizzle
		const layer = ZeroStoreDrizzleLive(mockDrizzle)

		expect(layer).toBeDefined()
		expect(typeof layer).toBe("object")
		// Verify it's a proper Layer
		expect(layer.pipe).toBeDefined()
	}),
)

layer(MockDrizzleLive)(
	"Runtime integration through layers should work correctly",
	(it) => {
		it.effect("should handle runtime context correctly in layers", () =>
			Effect.gen(function* () {
				const mockDrizzle = createDrizzleTestSetup().mockDrizzle
				const drizzleZeroStore = yield* DrizzleZeroStore.pipe(
					Effect.provide(ZeroStoreDrizzleLive(mockDrizzle)),
				)
				const schemaStore = drizzleZeroStore.forSchema(mockSchema)

				// Test that runtime context is properly handled in processMutations
				const runtimeMutators = createRuntimeMutators()
				const payload = {
					mutations: [
						{
							args: [{ name: "Runtime Test" }],
							id: 1,
							name: "people.runtimeTest",
						},
					],
				}

				// This tests that the runtime is properly passed through the layer
				yield* runMutationTest(schemaStore, runtimeMutators, payload)
			}),
		)

		it.effect(
			"should maintain layer consistency across multiple operations",
			() =>
				Effect.gen(function* () {
					const mockDrizzle = createDrizzleTestSetup().mockDrizzle
					const drizzleZeroStore = yield* DrizzleZeroStore.pipe(
						Effect.provide(ZeroStoreDrizzleLive(mockDrizzle)),
					)

					// Create multiple schema stores and verify they work consistently
					const schemaStore1 = drizzleZeroStore.forSchema(mockSchema)
					const schemaStore2 = drizzleZeroStore.forSchema(mockSchema)

					verifySchemaStoreInterface(schemaStore1)
					verifySchemaStoreInterface(schemaStore2)

					// Both should handle mutations consistently
					const mutators = createTestMutators()
					yield* runMutationTest(schemaStore1, mutators)
					yield* runMutationTest(schemaStore2, mutators)
				}),
		)
	},
)
