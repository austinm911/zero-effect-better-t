import { env } from "@zero-effect/env/server"
import { defineConfig } from "drizzle-kit"
import { Redacted } from "effect"

export default defineConfig({
	schema: "./src/db/schema",
	out: "./src/db/migrations",
	dialect: "postgresql",
	verbose: true,
	casing: "snake_case",
	strict: true,
	dbCredentials: {
		url: Redacted.value(env.DATABASE_URL),
	},
})
