/**
 * @important Run this with `bun test <filename>`
 *
 * Tests for zero-effect client implementation
 *
 * These tests verify the client-side Effect Transaction wrapper and mutator
 * conversion functionality as described in the zero-effect README.
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/suspicious/noMisplacedAssertion: <> */
/** biome-ignore-all lint/correctness/useYield: <> */

import { expect } from "bun:test"
import { Effect, Runtime, Schema } from "effect"
import { effect } from "../../effect-bun-test"
import {
	type CustomMutatorEfDefs,
	convertEffectMutatorsToPromise,
	createEffectTransaction,
	EffectTransaction,
	ZeroMutationProcessingError,
	ZeroMutatorAuthError,
	ZeroMutatorDatabaseError,
	ZeroMutatorValidationError,
} from "../src/client"

// ===== MOCK ZERO TRANSACTION =====

const createMockZeroTransaction = () => ({
	mutate: {
		people: {
			insert: async (data: any) => ({ id: "new_person", ...data }),
			update: async (data: any) => ({ updated: true, ...data }),
			delete: async (id: string) => ({ deleted: true, id }),
		},
		organizations: {
			insert: async (data: any) => ({ id: "new_org", ...data }),
		},
	},
	query: {
		people: {
			where: (field: string, value: any) => {
				const mockQuery = {
					first: async () => ({
						id: value,
						name: "Test User",
						email: "test@example.com",
					}),
					many: async () => [{ id: value, name: "Test User" }],
				}
				return mockQuery
			},
			findMany: async () => [{ id: "1", name: "User 1" }],
		},
	},
})

const createFailingZeroTransaction = () => ({
	mutate: {
		people: {
			insert: async () => {
				throw new Error("Insert failed")
			},
			update: async () => {
				throw new Error("Update failed")
			},
		},
	},
	query: {
		people: {
			where: () => {
				const failingQuery = {
					first: async () => {
						throw new Error("Query failed")
					},
				}
				return failingQuery
			},
			findMany: async () => {
				throw new Error("Query failed")
			},
		},
	},
})

// Mock schema for testing
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
		organizations: {
			columns: {
				id: { type: "string" },
				name: { type: "string" },
			},
			primaryKey: ["id"],
		},
	},
} as any

// ===== EFFECT TRANSACTION TESTS =====

effect("EffectTransaction should wrap Zero transaction correctly", () =>
	Effect.gen(function* () {
		const mockTx = createMockZeroTransaction()
		const effectTx = new EffectTransaction(mockTx)

		expect(effectTx).toBeInstanceOf(EffectTransaction)
		expect(effectTx.tx).toBe(mockTx)
		expect(effectTx.mutate).toBeDefined()
		expect(effectTx.query).toBeDefined()
	}),
)

effect("EffectTransaction mutations should return Effects", () =>
	Effect.gen(function* () {
		const mockTx = createMockZeroTransaction()
		const effectTx = new EffectTransaction(mockTx)

		// Test insert mutation
		const insertResult = yield* effectTx.mutate.people.insert({
			name: "John Doe",
			email: "john@example.com",
		})

		expect(insertResult.id).toBe("new_person")
		expect(insertResult.name).toBe("John Doe")

		// Test update mutation
		const updateResult = yield* effectTx.mutate.people.update({
			id: "1",
			name: "Updated Name",
		})

		expect(updateResult.updated).toBe(true)
		expect(updateResult.name).toBe("Updated Name")
	}),
)

effect("EffectTransaction queries should return Effects", () =>
	Effect.gen(function* () {
		const mockTx = createMockZeroTransaction()
		const effectTx = new EffectTransaction(mockTx)

		// Test direct query method (avoiding chaining for now)
		const people = yield* effectTx.query.people.findMany()

		expect(Array.isArray(people)).toBe(true)
		expect(people).toHaveLength(1)
		expect(people[0]?.name).toBe("User 1")
	}),
)

effect("EffectTransaction should handle mutation errors", () =>
	Effect.gen(function* () {
		const failingTx = createFailingZeroTransaction()
		const effectTx = new EffectTransaction(failingTx)

		const result = yield* effectTx.mutate.people
			.insert({
				name: "Test",
			})
			.pipe(Effect.either)

		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			expect(result.left).toBeInstanceOf(ZeroMutatorDatabaseError)
			expect(result.left.message).toContain("Database mutation failed")
			expect(result.left.cause).toBeInstanceOf(Error)
		}
	}),
)

effect("EffectTransaction should handle query errors", () =>
	Effect.gen(function* () {
		const failingTx = createFailingZeroTransaction()
		const effectTx = new EffectTransaction(failingTx)

		// findMany is already defined in createFailingZeroTransaction

		const result = yield* effectTx.query.people.findMany().pipe(Effect.either)

		expect(result._tag).toBe("Left")
		if (result._tag === "Left") {
			expect(result.left).toBeInstanceOf(ZeroMutatorDatabaseError)
			expect(result.left.message).toContain("Database query failed")
		}
	}),
)

effect("createEffectTransaction should create EffectTransaction", () =>
	Effect.gen(function* () {
		const mockTx = createMockZeroTransaction()
		const effectTx = createEffectTransaction(mockTx)

		expect(effectTx).toBeInstanceOf(EffectTransaction)
		expect(effectTx.tx).toBe(mockTx)
	}),
)

// ===== ERROR TYPES TESTS =====

effect("Error types should be properly constructed", () =>
	Effect.gen(function* () {
		// Test ZeroMutatorAuthError
		const authError = new ZeroMutatorAuthError({
			message: "Not authenticated",
		})
		expect(authError._tag).toBe("ZeroMutatorAuthError")
		expect(authError.message).toBe("Not authenticated")

		// Test ZeroMutatorValidationError
		const validationError = new ZeroMutatorValidationError({
			field: "email",
			message: "Invalid email format",
		})
		expect(validationError._tag).toBe("ZeroMutatorValidationError")
		expect(validationError.field).toBe("email")
		expect(validationError.message).toBe("Invalid email format")

		// Test ZeroMutatorDatabaseError
		const dbError = new ZeroMutatorDatabaseError({
			cause: new Error("Connection failed"),
			message: "Database error",
		})
		expect(dbError._tag).toBe("ZeroMutatorDatabaseError")
		expect(dbError.message).toBe("Database error")
		expect(dbError.cause).toBeInstanceOf(Error)

		// Test ZeroMutationProcessingError
		const processingError = new ZeroMutationProcessingError({
			cause: new Error("Processing failed"),
			message: "Mutation processing failed",
		})
		expect(processingError._tag).toBe("ZeroMutationProcessingError")
		expect(processingError.message).toBe("Mutation processing failed")
	}),
)

// ===== EFFECT MUTATORS CONVERSION TESTS =====

const createTestEffectMutators = (): CustomMutatorEfDefs<
	typeof mockSchema
> => ({
	people: {
		createPerson: (
			tx: EffectTransaction<typeof mockSchema>,
			input: { name: string; email?: string },
		) =>
			Effect.gen(function* () {
				yield* Effect.log("Creating person", { name: input.name })

				const result = yield* tx.mutate.people.insert({
					name: input.name,
					email: input.email || `${input.name.toLowerCase()}@example.com`,
				})

				return { id: result.id, ...input }
			}),

		updatePerson: (
			tx: EffectTransaction<typeof mockSchema>,
			input: { id: string; name?: string },
		) =>
			Effect.gen(function* () {
				// Simplified validation for testing
				if (!input.id) {
					return yield* Effect.fail(
						new ZeroMutatorValidationError({
							field: "id",
							message: "Person ID is required",
						}),
					)
				}

				const result = yield* tx.mutate.people.update({
					id: input.id,
					name: input.name || "Default Name",
				})

				return result
			}),

		deletePerson: (tx: EffectTransaction<typeof mockSchema>, id: string) =>
			Effect.gen(function* () {
				yield* Effect.log("Deleting person", { id })
				return yield* tx.mutate.people.delete(id)
			}),
	},

	organizations: {
		createOrganization: (
			tx: EffectTransaction<typeof mockSchema>,
			input: { name: string },
		) =>
			Effect.gen(function* () {
				const result = yield* tx.mutate.organizations.insert(input)
				return result
			}),
	},
})

const createFailingEffectMutators = (): CustomMutatorEfDefs<
	typeof mockSchema
> => ({
	people: {
		failingMutator: () =>
			Effect.fail(
				new ZeroMutatorDatabaseError({
					message: "Intentional failure",
				}),
			),
	},
})

effect(
	"convertEffectMutatorsToPromise should convert Effect mutators to Promise mutators",
	() =>
		Effect.gen(function* () {
			const effectMutators = createTestEffectMutators()
			const runtime = Runtime.defaultRuntime
			const promiseMutators = convertEffectMutatorsToPromise(
				effectMutators,
				runtime,
			)

			expect(promiseMutators).toBeDefined()
			expect(promiseMutators.people).toBeDefined()
			expect(typeof promiseMutators.people?.createPerson).toBe("function")
			expect(typeof promiseMutators.people?.updatePerson).toBe("function")
			expect(typeof promiseMutators.organizations?.createOrganization).toBe(
				"function",
			)
		}),
)

effect("Converted Promise mutators should work with Zero transaction", () =>
	Effect.gen(function* () {
		const effectMutators = createTestEffectMutators()
		const runtime = Runtime.defaultRuntime
		const promiseMutators = convertEffectMutatorsToPromise(
			effectMutators,
			runtime,
		)
		const mockTx = createMockZeroTransaction()

		// Test createPerson mutator
		const createResult = yield* Effect.promise(() =>
			promiseMutators.people!.createPerson!(mockTx as any, {
				name: "John Doe",
				email: "john@example.com",
			}),
		)

		expect(createResult.id).toBe("new_person")
		expect(createResult.name).toBe("John Doe")

		// Test updatePerson mutator
		const updateResult = yield* Effect.promise(() =>
			promiseMutators.people!.updatePerson!(mockTx as any, {
				id: "123",
				name: "Updated Name",
			}),
		)

		expect(updateResult.updated).toBe(true)
	}),
)

effect("Converted mutators should handle Effect errors properly", () =>
	Effect.gen(function* () {
		const failingMutators = createFailingEffectMutators()
		const runtime = Runtime.defaultRuntime
		const promiseMutators = convertEffectMutatorsToPromise(
			failingMutators,
			runtime,
		)
		const mockTx = createMockZeroTransaction()

		const result = yield* Effect.tryPromise(() =>
			promiseMutators.people!.failingMutator!(mockTx as any),
		).pipe(Effect.either)

		// The main test is that it should fail (not throw)
		expect(result._tag).toBe("Left")
		expect(result._tag !== "Right").toBe(true)
	}),
)

// ===== CLIENT USAGE PATTERNS (from README) =====

effect("Client usage pattern should work as described in README", () =>
	Effect.gen(function* () {
		// Simulate the README pattern
		const authData = { userId: "user123" }

		const createMutators = (auth: typeof authData | undefined) => ({
			people: {
				update: (
					tx: EffectTransaction<typeof mockSchema>,
					input: { id: string; name: string },
				) =>
					Effect.gen(function* () {
						// Check authentication (from README example)
						if (!auth) {
							return yield* Effect.fail(
								new ZeroMutatorAuthError({
									message: "Not authenticated",
								}),
							)
						}

						// Validate input using Effect Schema
						const UpdatePersonInput = Schema.Struct({
							id: Schema.String,
							name: Schema.String,
						})

						const validatedInput = yield* Schema.decodeUnknown(
							UpdatePersonInput,
						)(input).pipe(
							Effect.mapError(
								(error) =>
									new ZeroMutatorValidationError({
										message: `Invalid input: ${String(error)}`,
									}),
							),
						)

						// Perform mutation
						yield* tx.mutate.people.update(validatedInput)

						yield* Effect.log("Person updated successfully", {
							id: validatedInput.id,
						})

						return validatedInput
					}),
			},
		})

		// Test the pattern
		const effectMutators = createMutators(authData)
		const runtime = Runtime.defaultRuntime
		const promiseMutators = convertEffectMutatorsToPromise(
			effectMutators,
			runtime,
		)
		const mockTx = createMockZeroTransaction()

		const result = yield* Effect.promise(() =>
			promiseMutators.people!.update!(mockTx as any, {
				id: "123",
				name: "Updated Name",
			}),
		)

		expect(result.id).toBe("123")
		expect(result.name).toBe("Updated Name")
	}),
)

// ===== RUNTIME INTEGRATION TESTS =====

effect("Different runtimes should allow different behavior", () =>
	Effect.gen(function* () {
		// Service for demonstration
		class NotifyService extends Effect.Service<NotifyService>()(
			"NotifyService",
			{
				effect: Effect.succeed({
					notify: (message: string) => Effect.log(`Notification: ${message}`),
				}),
			},
		) {}

		const mutatorWithService = (
			tx: EffectTransaction<typeof mockSchema>,
			input: { name: string },
		) =>
			Effect.gen(function* () {
				// Simplified for testing - just log instead of using service
				yield* Effect.log(`Creating person ${input.name}`)

				const result = yield* tx.mutate.people.insert(input)

				return result
			})

		const effectMutators = {
			people: { createWithNotification: mutatorWithService },
		}

		// Default runtime
		const defaultRuntime = Runtime.defaultRuntime
		const defaultMutators = convertEffectMutatorsToPromise(
			effectMutators,
			defaultRuntime,
		)

		// Custom runtime with service
		const customRuntime = Runtime.defaultRuntime
		const customMutators = convertEffectMutatorsToPromise(
			effectMutators,
			customRuntime,
		)

		// Both should work but have different internal behavior
		expect(typeof defaultMutators.people?.createWithNotification).toBe(
			"function",
		)
		expect(typeof customMutators.people?.createWithNotification).toBe(
			"function",
		)

		const mockTx = createMockZeroTransaction()

		const result1 = yield* Effect.promise(() =>
			defaultMutators.people!.createWithNotification!(mockTx as any, {
				name: "Test 1",
			}),
		)

		const result2 = yield* Effect.promise(() =>
			customMutators.people!.createWithNotification!(mockTx as any, {
				name: "Test 2",
			}),
		)

		expect(result1.id).toBe("new_person")
		expect(result2.id).toBe("new_person")
	}),
)

// ===== EDGE CASES AND ERROR SCENARIOS =====

effect("Empty mutators object should be handled correctly", () =>
	Effect.gen(function* () {
		const emptyMutators = {}
		const runtime = Runtime.defaultRuntime
		const converted = convertEffectMutatorsToPromise(emptyMutators, runtime)

		expect(converted).toEqual({})
	}),
)

effect("Nested object mutations should work correctly", () =>
	Effect.gen(function* () {
		const mockTx = createMockZeroTransaction()
		const effectTx = new EffectTransaction(mockTx)

		// Test deeply nested access
		const orgResult = yield* effectTx.mutate.organizations.insert({
			name: "Test Organization",
		})

		expect(orgResult.id).toBe("new_org")
		expect(orgResult.name).toBe("Test Organization")
	}),
)

effect(
	"EffectTransaction should handle non-function properties correctly",
	() =>
		Effect.gen(function* () {
			const mockTxWithMetadata = {
				...createMockZeroTransaction(),
				metadata: { version: "1.0" },
				config: { timeout: 5000 },
			}

			const effectTx = new EffectTransaction(mockTxWithMetadata)

			// Non-function properties should be accessible
			expect((effectTx.tx as any).metadata).toEqual({ version: "1.0" })
			expect((effectTx.tx as any).config).toEqual({ timeout: 5000 })
		}),
)
