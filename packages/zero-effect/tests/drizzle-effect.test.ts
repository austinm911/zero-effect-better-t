/**
 * @important Run this with `bun test <filename>`
 *
 * Focused tests for Effect-SQL server implementation
 *
 * These tests only cover Effect-specific functionality that differs from Node implementation:
 * - Effect service integration and dependency injection
 * - Effect layer composition and resource management
 * - Effect-SQL specific error handling
 */
/** biome-ignore-all lint/nursery/noShadow: <> */
/** biome-ignore-all lint/performance/noNamespaceImport: <> */
/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/suspicious/noMisplacedAssertion: <> */
/** biome-ignore-all lint/correctness/useYield: <> */

import { expect } from "bun:test"
import { SqlClient } from "@effect/sql/SqlClient"
import * as Pg from "@effect/sql-drizzle/Pg"
/**
 * Server mutators that extend client mutators with server-specific logic
 *
 * These mutators follow Zero's pattern where server mutators can add
 * business logic on top of the base client mutations while maintaining
 * the same interface.
 *
 * @since 1.0.0
 */
import { Effect, Layer, Runtime } from "effect"
import type { SchemaMutators } from "@/shared/types"
import { effect, layer } from "../../effect-bun-test/src"
import type { EffectTransaction } from "../src/client"
import {
	EffectDrizzleZeroStore,
	EffectDrizzleZeroStoreLive,
} from "../src/server/drizzle-effect"
import { type AuthData, createClientMutators } from "./client-mutators.test"

/**
 * Example notification service interface
 * In real applications, this would be your actual notification service
 *
 * @since 1.0.0
 */
export class NotifyService extends Effect.Service<NotifyService>()(
	"NotifyService",
	{
		effect: Effect.succeed({
			sendUpdateNotification: (entityId: string) =>
				Effect.log("Notification sent", { entityId }),
			sendCreationNotification: (entityId: string, type: string) =>
				Effect.log("Creation notification sent", { entityId, type }),
		}),
	},
) {}

/**
 * Create server mutators that extend client mutators
 *
 * Server mutators can:
 * - Add server-only business logic (audit logs, notifications, webhooks)
 * - Perform additional validation or authorization
 * - Integrate with server-only Effect services
 * - Override client behavior when needed
 *
 * @since 1.0.0
 * @category constructors
 */
export function createServerMutators<
	TSchema extends { tables: { people: any; groups: any } },
>(authData: AuthData | undefined): SchemaMutators<TSchema> {
	// Start with the shared client mutators
	const clientMutators = createClientMutators<TSchema>(authData)

	return {
		people: {
			...clientMutators.people,

			// Extend create with server-specific logic
			create: (tx: EffectTransaction<TSchema>, input: any) =>
				Effect.gen(function* () {
					// 1. Run the base client mutation first
					const result = yield* clientMutators.people!.create!(tx, input)

					// 2. Add server-only logic
					if (authData) {
						// Server-side audit logging
						yield* Effect.log("Server: Person created", {
							personId: result.id,
							userId: authData.userId,
							organizationId: authData.organizationId,
						})

						// Business logic - notifications, webhooks, etc.
						const notifyService = yield* NotifyService
						yield* notifyService.sendCreationNotification(result.id, "person")

						// Example: Additional server-only validation or processing
						// yield* auditService.logCreation('person', result.id, authData.userId)
						// yield* webhookService.sendPersonCreated(result)
					}

					return result
				}),

			// Extend update with server-specific logic
			update: (tx: EffectTransaction<TSchema>, input: any) =>
				Effect.gen(function* () {
					// Run base client mutation
					const result = yield* clientMutators.people!.update!(tx, input)

					// Add server-specific logic
					if (authData) {
						yield* Effect.log("Server: Person updated", {
							personId: input.id,
							userId: authData.userId,
							changes: Object.keys(input).filter((k) => k !== "id"),
						})

						// Send notifications
						const notifyService = yield* NotifyService
						yield* notifyService.sendUpdateNotification(input.id)
					}

					return result
				}),
		},

		groups: {
			...clientMutators.groups,

			// Extend create with additional server logic
			create: (tx: EffectTransaction<TSchema>, input: any) =>
				Effect.gen(function* () {
					// Run base client mutation (includes role check)
					const result = yield* clientMutators.groups!.create!(tx, input)

					// Server-only business logic
					if (authData?.role === "admin") {
						yield* Effect.log("Server: Group created by admin", {
							groupId: result.id,
							adminId: authData.userId,
							groupName: input.name,
						})

						// Additional admin-only logic
						const notifyService = yield* NotifyService
						yield* notifyService.sendCreationNotification(result.id, "group")

						// Example: Auto-add admin to group, send notifications, etc.
						// yield* membershipService.addAdminToGroup(result.id, authData.userId)
						// yield* notifyService.notifyOrgAdmins(result.id)
					}

					return result
				}),

			// Server-only mutator (not available on client)
			adminBulkCreate: (
				tx: EffectTransaction<TSchema>,
				groups: Array<{ name: string; description?: string }>,
			) =>
				Effect.gen(function* () {
					// This mutator only exists on the server
					if (!authData || authData.role !== "admin") {
						return yield* Effect.fail(new Error("Admin access required"))
					}

					yield* Effect.log("Server: Admin bulk creating groups", {
						count: groups.length,
						adminId: authData.userId,
					})

					const results = []
					for (const group of groups) {
						const result = yield* tx.mutate.groups.insert({
							name: group.name,
							description: group.description || "",
						})
						results.push(result)
					}

					// Bulk notification
					const notifyService = yield* NotifyService
					yield* Effect.forEach(results, (result) =>
						notifyService.sendCreationNotification(result.id, "group"),
					)

					return results
				}),
		},
	}
}

/**
 * Type for server mutators
 * @since 1.0.0
 */
export type ServerMutators<
	TSchema extends { tables: { people: any; groups: any } },
> = ReturnType<typeof createServerMutators<TSchema>>

// ===== MOCK EFFECT LAYERS =====

const MockPgDrizzleLive = Layer.succeed(Pg.PgDrizzle, {
	execute: async () => ({ rows: [{ id: "effect-test", success: true }] }),
	transaction: async (fn: any) => fn({ execute: async () => ({ rows: [] }) }),
} as any)

const MockSqlClientLive = Layer.succeed(SqlClient.SqlClient, {
	execute: () =>
		Effect.succeed({ rows: [{ id: "effect-test", success: true }] }),
	executeValues: () => Effect.succeed({ rows: [] }),
	executeRaw: () => Effect.succeed({ rows: [] }),
	executeStream: () => Effect.succeed([]),
	executeWithoutTransform: () => Effect.succeed({ rows: [] }),
	withTransaction: (fn: any) => fn,
	reserve: Effect.succeed({
		execute: () => Effect.succeed({ rows: [] }),
		executeValues: () => Effect.succeed({ rows: [] }),
		executeRaw: () => Effect.succeed({ rows: [] }),
		executeStream: () => Effect.succeed([]),
		executeWithoutTransform: () => Effect.succeed({ rows: [] }),
	}),
	unsafe: () => Effect.succeed({ rows: [] }),
} as any)

const TestEffectServerLive = Layer.mergeAll(
	EffectDrizzleZeroStoreLive.pipe(
		Layer.provide(Layer.mergeAll(MockPgDrizzleLive, MockSqlClientLive)),
	),
	NotifyService.Default,
)

// ===== TEST DATA =====

const mockSchema = {
	tables: {
		people: {
			columns: { id: { type: "string" }, name: { type: "string" } },
			primaryKey: ["id"],
		},
	},
} as any

const createTestAuth = (): AuthData => ({
	userId: "effect-user",
	organizationId: "effect-org",
	role: "admin",
})

// ===== EFFECT-SPECIFIC TESTS =====

layer(TestEffectServerLive)("Effect service integration should work", () =>
	Effect.gen(function* () {
		// Test that Effect services are properly composed
		const store = yield* EffectDrizzleZeroStore
		const notifyService = yield* NotifyService

		expect(store).toBeDefined()
		expect(notifyService).toBeDefined()
		expect(typeof store.forSchema).toBe("function")
		expect(typeof notifyService.sendUpdateNotification).toBe("function")
	}),
)

layer(TestEffectServerLive)(
	"Effect server mutators should integrate with services",
	() => () =>
		Effect.gen(function* () {
			// Test that server mutators work with Effect services
			const auth = createTestAuth()
			const mutators = createServerMutators(auth)

			// Server mutators should be Effect functions that can access services
			expect(mutators.people).toBeDefined()
			expect(typeof mutators.people?.create).toBe("function")
			expect(typeof mutators.groups?.adminBulkCreate).toBe("function") // Server-only

			// Should be able to create Effect that uses services
			const mockTx = {
				mutate: {
					people: {
						insert: async (data: any) => ({ id: "new", ...data }),
					},
				},
			} as any

			const createEffect = mutators.people!.create!(mockTx, {
				name: "Test",
			})
			expect(createEffect).toBeDefined()
			expect(typeof createEffect.pipe).toBe("function")
		}).pipe(Effect.provide(TestEffectServerLive)),
)

effect("Effect layer composition should be type-safe", () =>
	Effect.gen(function* () {
		// Test that layer composition works correctly
		const layer = TestEffectServerLive

		expect(layer).toBeDefined()
		expect(typeof layer).toBe("object")
		expect(layer.pipe).toBeDefined()
	}),
)

effect("Effect store creation should work without layers", () =>
	Effect.gen(function* () {
		// Test direct Effect store creation (without service layers)
		const mockDb = {
			execute: async () => ({ rows: [] }),
			transaction: async (fn: any) =>
				fn({ execute: async () => ({ rows: [] }) }),
		} as any

		const { makeEffectDrizzleStore } = yield* Effect.promise(
			() => import("../src/server/drizzle-effect"),
		)

		const store = makeEffectDrizzleStore(mockDb, Runtime.defaultRuntime)
		expect(store).toBeDefined()
		expect(typeof store.forSchema).toBe("function")
	}),
)
