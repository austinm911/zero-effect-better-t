import type { SchemaMutators } from "@zero-effect/zero-effect/shared/types"
import type { AuthData, Schema } from "../schema"
import { createClientMutators } from "./client"

export const createServerMutators = <TSchema extends Schema>(
	authData: AuthData | undefined,
): SchemaMutators<TSchema> => {
	const clientMutators = createClientMutators<TSchema>(authData)

	return {
		...clientMutators,
	}
}
