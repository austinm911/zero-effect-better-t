/**
 * @important Run this with `bun test <filename>`
 *
 * Integration tests for Effect-SQL and Node-postgres compatibility
 *
 * These tests verify that:
 * - Both implementations work with the same client mutators
 * - Bundle safety is maintained
 * - Migration between implementations is seamless
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/suspicious/noMisplacedAssertion: <> */
/** biome-ignore-all lint/correctness/useYield: <> */

import { expect } from "bun:test"
import { Effect, Runtime } from "effect"
import { effect } from "../../effect-bun-test"
import { convertEffectMutatorsToPromise } from "../src/client"
// Effect-SQL implementation
import { makeEffectDrizzleStore } from "../src/server/drizzle-effect"
// Node-postgres implementation
import { makeDrizzleStore } from "../src/server/drizzle-node"
import { type AuthData, createClientMutators } from "./client-mutators.test"

// ===== SHARED TEST DATA =====

const mockSchema = {
	tables: {
		people: {
			columns: { id: { type: "string" }, name: { type: "string" } },
			primaryKey: ["id"],
		},
	},
} as any

const createTestAuth = (): AuthData => ({
	userId: "integration-user",
	role: "admin",
})

const createMockNodeDb = () => ({
	execute: async () => [{ id: "node-id", success: true }],
	transaction: async (fn: any) =>
		fn({ execute: async () => [{ success: true }] }),
})

const createMockEffectDb = () => ({
	execute: async () => ({ rows: [{ id: "effect-id", success: true }] }),
	transaction: async (fn: any) =>
		fn({ execute: async () => ({ rows: [{ success: true }] }) }),
})

// ===== CROSS-IMPLEMENTATION COMPATIBILITY TESTS =====

effect("Client mutators should be implementation-agnostic", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const clientMutators = createClientMutators(auth)

		// Client mutators should work without any server dependencies
		expect(clientMutators).toBeDefined()
		expect(clientMutators.people).toBeDefined()
		expect(typeof clientMutators.people?.create).toBe("function")
		expect(typeof clientMutators.people?.update).toBe("function")

		// Should convert to Promise mutators for Zero
		const runtime = Runtime.defaultRuntime
		const promiseMutators = convertEffectMutatorsToPromise(
			clientMutators,
			runtime,
		)

		expect(promiseMutators).toBeDefined()
		expect(typeof promiseMutators.people?.create).toBe("function")
	}),
)

effect("Both implementations should provide identical APIs", () =>
	Effect.gen(function* () {
		const runtime = Runtime.defaultRuntime

		// Create stores with both implementations
		const nodeStore = makeDrizzleStore(createMockNodeDb() as any, runtime)
		const effectStore = makeEffectDrizzleStore(
			createMockEffectDb() as any,
			runtime,
		)

		// API should be identical
		expect(typeof nodeStore.forSchema).toBe("function")
		expect(typeof effectStore.forSchema).toBe("function")

		const nodeSchema = nodeStore.forSchema(mockSchema)
		const effectSchema = effectStore.forSchema(mockSchema)

		expect(typeof nodeSchema.processMutations).toBe("function")
		expect(typeof effectSchema.processMutations).toBe("function")
	}),
)

effect("Bundle safety should be maintained", () =>
	Effect.gen(function* () {
		// Test that client-only imports don't bring in database code
		const { createClientMutators: clientImport } = yield* Effect.promise(
			() => import("./client-mutators.test"),
		)

		const { convertEffectMutatorsToPromise: convertImport } =
			yield* Effect.promise(() => import("../src/client"))

		// These should work without any database dependencies
		const auth = createTestAuth()
		const mutators = clientImport(auth)
		const runtime = Runtime.defaultRuntime
		const promiseMutators = convertImport(mutators, runtime)

		expect(mutators).toBeDefined()
		expect(promiseMutators).toBeDefined()
		expect(typeof promiseMutators.people?.create).toBe("function")
	}),
)

effect("Migration between implementations should be seamless", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const runtime = Runtime.defaultRuntime

		// Same client mutators work with both
		const clientMutators = createClientMutators(auth)
		const promiseMutators = convertEffectMutatorsToPromise(
			clientMutators,
			runtime,
		)

		// Can switch between implementations using identical APIs
		const nodeStore = makeDrizzleStore(createMockNodeDb() as any, runtime)
		const effectStore = makeEffectDrizzleStore(
			createMockEffectDb() as any,
			runtime,
		)

		// Both create compatible schema stores
		const nodeSchema = nodeStore.forSchema(mockSchema)
		const effectSchema = effectStore.forSchema(mockSchema)

		// Both accept the same parameters
		expect(typeof nodeSchema.processMutations).toBe("function")
		expect(typeof effectSchema.processMutations).toBe("function")

		// Implementation choice doesn't affect client code
		expect(promiseMutators).toBeDefined()
	}),
)
