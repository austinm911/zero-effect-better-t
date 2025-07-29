import { env } from "@zero-effect/env/server"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { Redacted } from "effect"
import { Drizzle } from "../db/client"
import * as schema from "../db/schema/auth"

export const auth: ReturnType<typeof betterAuth> = betterAuth({
	database: drizzleAdapter(Drizzle, {
		provider: "pg",
		camelCase: true,
		schema: schema,
	}),
	plugins: [
		organization({
			teams: {
				enabled: true,
			},
		}),
	],
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	secret: Redacted.value(env.BETTER_AUTH_SECRET),
	baseURL: env.BETTER_AUTH_URL,
})
