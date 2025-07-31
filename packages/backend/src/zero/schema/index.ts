import {
	ANYONE_CAN_DO_ANYTHING,
	definePermissions,
	type PermissionsConfig,
	type Zero as ZeroType,
} from "@rocicorp/zero"
import type { Mutators } from "../mutators/client"
import { type Schema, schema } from "../schema/schema.gen"

// ----------------------
// Exports
// ----------------------

export type { PullRow } from "@rocicorp/zero"
export {
	ANYONE_CAN_DO_ANYTHING,
	definePermissions,
	type PermissionsConfig,
} from "@rocicorp/zero"

export { type Schema, schema } from "../schema/schema.gen"

// TODO: Fix this type issue
export type Zero = ZeroType<Schema, Mutators>
export type ZeroTableNames = keyof Schema["tables"]

// ----------------------
// Permissions
// ----------------------

export type AuthData = {
	userId: string
}

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	return {
		// Auth Tables
		user: ANYONE_CAN_DO_ANYTHING,
		session: ANYONE_CAN_DO_ANYTHING,
		account: ANYONE_CAN_DO_ANYTHING,

		// Blog Tables
		posts: ANYONE_CAN_DO_ANYTHING,
		tags: ANYONE_CAN_DO_ANYTHING,
		postTags: ANYONE_CAN_DO_ANYTHING,
	} satisfies PermissionsConfig<AuthData, Schema>
})
