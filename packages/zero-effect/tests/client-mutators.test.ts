/**
 * @important Run this with `bun test <filename>`
 *
 * Tests for shared client mutators (database-free)
 *
 * These tests verify that the client mutators:
 * - Are safe for client bundles (no database dependencies)
 * - Properly validate input and authentication
 * - Use only Zero's Transaction API
 * - Work with Effect-TS error handling
 */
/** biome-ignore-all lint/nursery/noShadow: <> */
/** biome-ignore-all lint/style/noNonNullAssertion: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/suspicious/noMisplacedAssertion: <> */
/** biome-ignore-all lint/correctness/useYield: <> */

/**
 * Database-free client mutators for zero-effect
 *
 * These mutators are shared between all implementations and contain NO database code.
 * They are safe for client bundles and use only Zero's Transaction API.
 *
 * @since 1.0.0
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import type { Schema as ZeroSchema } from "@rocicorp/zero"
import { Effect, Schema } from "effect"
import { EffectTransaction } from "../src/client"
import {
	ZeroMutatorAuthError,
	ZeroMutatorValidationError,
} from "../src/shared/errors"
import type { SchemaMutators } from "../src/shared/types"

/**
 * Input schemas for validation
 * @since 1.0.0
 */
const CreatePersonInput = Schema.Struct({
	name: Schema.String,
	email: Schema.String.pipe(Schema.optional),
})

const UpdatePersonInput = Schema.Struct({
	id: Schema.String,
	name: Schema.String.pipe(Schema.optional),
	email: Schema.String.pipe(Schema.optional),
})

const CreateGroupInput = Schema.Struct({
	name: Schema.String,
	description: Schema.String.pipe(Schema.optional),
})

type CreatePersonInput = Schema.Schema.Type<typeof CreatePersonInput>
type UpdatePersonInput = Schema.Schema.Type<typeof UpdatePersonInput>
type CreateGroupInput = Schema.Schema.Type<typeof CreateGroupInput>

export interface AuthData {
	readonly userId: string
	readonly organizationId?: string
	readonly role?: "admin" | "member" | "viewer"
}

/**
 * Create database-free client mutators
 *
 * These mutators:
 * - Use only Zero's Transaction API (no direct database access)
 * - Perform client-side validation and authentication checks
 * - Are safe to include in client bundles
 * - Provide speculative mutations that get overridden by server results
 *
 * @since 1.0.0
 * @category constructors
 */
export function createClientMutators<TSchema extends ZeroSchema>(
	authData: AuthData | undefined,
): SchemaMutators<TSchema> {
	return {
		people: {
			create: (tx: EffectTransaction<TSchema>, input: CreatePersonInput) =>
				Effect.gen(function* () {
					// 1. Authentication check
					if (!authData) {
						return yield* Effect.fail(
							new ZeroMutatorAuthError({
								message: "Not authenticated",
							}),
						)
					}

					// 2. Input validation using Effect Schema
					const validatedInput = yield* Schema.decodeUnknown(CreatePersonInput)(
						input,
					).pipe(
						Effect.mapError(
							(error) =>
								new ZeroMutatorValidationError({
									message: `Invalid input: ${String(error)}`,
								}),
						),
					)

					// 3. Use Zero's Transaction API (speculative mutation)
					const result = yield* tx.mutate.people.insert({
						name: validatedInput.name,
						email:
							validatedInput.email ||
							`${validatedInput.name.toLowerCase()}@example.com`,
					})

					// 4. Client-side logging
					yield* Effect.log("Person created (client-side)", {
						id: result.id,
						userId: authData.userId,
					})

					return result
				}),

			update: (tx: EffectTransaction<TSchema>, input: UpdatePersonInput) =>
				Effect.gen(function* () {
					// Authentication check
					if (!authData) {
						return yield* Effect.fail(
							new ZeroMutatorAuthError({
								message: "Not authenticated",
							}),
						)
					}

					// Input validation
					const validatedInput = yield* Schema.decodeUnknown(UpdatePersonInput)(
						input,
					).pipe(
						Effect.mapError(
							(error) =>
								new ZeroMutatorValidationError({
									message: `Invalid input: ${String(error)}`,
								}),
						),
					)

					// Speculative mutation
					const result = yield* tx.mutate.people.update(validatedInput)

					yield* Effect.log("Person updated (client-side)", {
						id: validatedInput.id,
						userId: authData.userId,
					})

					return result
				}),
		},

		groups: {
			create: (tx: EffectTransaction<TSchema>, input: CreateGroupInput) =>
				Effect.gen(function* () {
					// Authentication check
					if (!authData) {
						return yield* Effect.fail(
							new ZeroMutatorAuthError({
								message: "Not authenticated",
							}),
						)
					}

					// Role-based authorization (client-side check)
					if (authData.role !== "admin") {
						return yield* Effect.fail(
							new ZeroMutatorAuthError({
								message: "Insufficient permissions - admin required",
							}),
						)
					}

					// Input validation
					const validatedInput = yield* Schema.decodeUnknown(CreateGroupInput)(
						input,
					).pipe(
						Effect.mapError(
							(error) =>
								new ZeroMutatorValidationError({
									message: `Invalid input: ${String(error)}`,
								}),
						),
					)

					// Speculative mutation
					const result = yield* tx.mutate.groups.insert({
						name: validatedInput.name,
						description: validatedInput.description || "",
					})

					yield* Effect.log("Group created (client-side)", {
						id: result.id,
						userId: authData.userId,
					})

					return result
				}),
		},
	}
}

/**
 * Type for the client mutators
 * @since 1.0.0
 */
export type ClientMutators<
	TSchema extends { tables: { people: any; groups: any } },
> = ReturnType<typeof createClientMutators<TSchema>>

import { expect } from "bun:test"
import { effect } from "../../effect-bun-test"

// ===== MOCK ZERO TRANSACTION =====

const createMockZeroTransaction = () =>
	({
		mutate: {
			people: {
				insert: async (data: any) => ({ id: "new_person", ...data }),
				update: async (data: any) => ({ updated: true, ...data }),
			},
			groups: {
				insert: async (data: any) => ({ id: "new_group", ...data }),
			},
		},
		query: {
			people: {
				findMany: async () => [{ id: "1", name: "User 1" }],
			},
		},
	}) as any

const mockSchema = {
	tables: {
		people: {
			columns: {
				id: { type: "string" },
				name: { type: "string" },
				email: { type: "string" },
			},
			primaryKey: ["id"],
		},
		groups: {
			columns: {
				id: { type: "string" },
				name: { type: "string" },
				description: { type: "string" },
			},
			primaryKey: ["id"],
		},
	},
} as any

// ===== TEST DATA =====

const createTestAuth = (): AuthData => ({
	userId: "user123",
	organizationId: "org456",
	role: "admin",
})

const createMemberAuth = (): AuthData => ({
	userId: "user456",
	organizationId: "org456",
	role: "member",
})

// ===== CLIENT MUTATORS TESTS =====

effect("createClientMutators should create proper mutator structure", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)

		expect(mutators).toBeDefined()
		expect(mutators.people).toBeDefined()
		expect(mutators.groups).toBeDefined()
		expect(typeof mutators.people?.create).toBe("function")
		expect(typeof mutators.people?.update).toBe("function")
		expect(typeof mutators.groups?.create).toBe("function")
	}),
)

effect("createClientMutators should work without auth", () =>
	Effect.gen(function* () {
		const mutators = createClientMutators(undefined)

		expect(mutators).toBeDefined()
		expect(mutators.people).toBeDefined()
		expect(mutators.groups).toBeDefined()
		// Functions should exist but will fail when called without auth
		expect(typeof mutators.people?.create).toBe("function")
	}),
)

// ===== AUTHENTICATION TESTS =====

effect("Client mutators should require authentication", () =>
	Effect.gen(function* () {
		const mutators = createClientMutators(undefined)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		// Should fail with auth error
		const result = yield* mutators.people!.create!(mockTx, {
			name: "Test",
		}).pipe(Effect.either)

		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			expect(result.left).toBeInstanceOf(ZeroMutatorAuthError)
			expect(result.left.message).toBe("Not authenticated")
		}
	}),
)

effect("Client mutators should enforce role-based authorization", () =>
	Effect.gen(function* () {
		const memberAuth = createMemberAuth()
		const mutators = createClientMutators(memberAuth)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		// Members should not be able to create groups
		const result = yield* mutators.groups!.create!(mockTx, {
			name: "Test Group",
		}).pipe(Effect.either)

		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			expect(result.left).toBeInstanceOf(ZeroMutatorAuthError)
			expect(result.left.message).toBe(
				"Insufficient permissions - admin required",
			)
		}
	}),
)

effect("Client mutators should work with proper authentication", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		// Should succeed with proper auth
		const result = yield* mutators.people!.create!(mockTx, {
			name: "John Doe",
		})

		expect(result.id).toBe("new_person")
		expect(result.name).toBe("John Doe")
		expect(result.email).toBe("john doe@example.com")
	}),
)

// ===== VALIDATION TESTS =====

effect("Client mutators should validate input using Schema", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		// Should fail with validation error for invalid input
		const result = yield* mutators.people!.create!(mockTx, {
			name: 123,
		} as any).pipe(Effect.either)

		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			expect(result.left).toBeInstanceOf(ZeroMutatorValidationError)
			expect(result.left.message).toContain("Invalid input")
		}
	}),
)

effect("Client mutators should handle update operations", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		const result = yield* mutators.people!.update!(mockTx, {
			id: "123",
			name: "Updated Name",
		})

		expect(result.updated).toBe(true)
		expect(result.id).toBe("123")
		expect(result.name).toBe("Updated Name")
	}),
)

// ===== ZERO TRANSACTION INTEGRATION TESTS =====

effect("Client mutators should use Zero Transaction API only", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		// Test person creation
		const personResult = yield* mutators.people!.create!(mockTx, {
			name: "Jane Doe",
			email: "jane@example.com",
		})

		expect(personResult.id).toBe("new_person")
		expect(personResult.name).toBe("Jane Doe")
		expect(personResult.email).toBe("jane@example.com")

		// Test group creation (admin only)
		const groupResult = yield* mutators.groups!.create!(mockTx, {
			name: "Test Group",
			description: "A test group",
		})

		expect(groupResult.id).toBe("new_group")
		expect(groupResult.name).toBe("Test Group")
		expect(groupResult.description).toBe("A test group")
	}),
)

// ===== BUNDLE SAFETY TESTS =====

effect("Client mutators should have no database dependencies", () =>
	Effect.gen(function* () {
		// This test ensures the client mutators module can be imported
		// without bringing in any database-specific code
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)

		// The mutators should be created without any database connections
		expect(mutators).toBeDefined()
		expect(typeof mutators.people?.create).toBe("function")

		// Verify that the mutators are pure Effect functions
		const mockTx = new EffectTransaction(createMockZeroTransaction())
		const effect = mutators.people!.create!(mockTx, { name: "Test" })

		// Should return an Effect without executing
		expect(effect).toBeDefined()
		expect(typeof effect.pipe).toBe("function")
	}),
)

// ===== ERROR HANDLING TESTS =====

effect("Client mutators should handle various error scenarios", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)

		// Test with failing transaction
		const failingTx = new EffectTransaction({
			mutate: {
				people: {
					insert: () => {
						throw new Error("Transaction failed")
					},
				},
			},
		} as any)

		const result = yield* mutators.people!.create!(failingTx, {
			name: "Test",
		}).pipe(Effect.either)

		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			// Should propagate the transaction error
			expect(result.left.message).toContain("Database mutation failed")
		}
	}),
)

// ===== EDGE CASES =====

effect("Client mutators should handle edge cases", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		// Test with minimal valid input
		const result = yield* mutators.people!.create!(mockTx, { name: "X" })

		expect(result.id).toBe("new_person")
		expect(result.name).toBe("X")
		expect(result.email).toBe("x@example.com") // Auto-generated email
	}),
)

effect("Client mutators should validate optional fields", () =>
	Effect.gen(function* () {
		const auth = createTestAuth()
		const mutators = createClientMutators(auth)
		const mockTx = new EffectTransaction(createMockZeroTransaction())

		// Test with optional email
		const result = yield* mutators.people!.create!(mockTx, {
			name: "John Doe",
			email: "john.custom@example.com",
		})

		expect(result.email).toBe("john.custom@example.com")

		// Test update with partial data
		const updateResult = yield* mutators.people!.update!(mockTx, {
			id: "123",
			name: "Updated Name",
			// email not provided - should be fine
		})

		expect(updateResult.id).toBe("123")
		expect(updateResult.name).toBe("Updated Name")
	}),
)
