import { Config, ConfigProvider, Effect } from "effect"

const configSchema = Config.all({
	NODE_ENV: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
	LOG_LEVEL: Config.string("LOG_LEVEL").pipe(Config.withDefault("info")),
	DATABASE_URL: Config.redacted("ZERO_UPSTREAM_DB"),
	CLOUDFLARE_API_TOKEN: Config.redacted("CLOUDFLARE_API_TOKEN"),
	ALCHEMY_STATE_TOKEN: Config.redacted("ALCHEMY_STATE_TOKEN"),
	BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
	BETTER_AUTH_URL: Config.string("BETTER_AUTH_URL").pipe(
		Config.withDefault("http://localhost:3000"),
	),
	CORS_ORIGIN: Config.string("CORS_ORIGIN").pipe(
		Config.withDefault("http://localhost:3000"),
	),
})

const provider = ConfigProvider.fromEnv().pipe(ConfigProvider.constantCase)
const loadConfig = provider.load(configSchema)

export const env = Effect.runSync(loadConfig)
