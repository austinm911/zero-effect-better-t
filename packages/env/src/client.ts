/// <reference types="vite/client" />

import { Config, ConfigProvider, Effect } from "effect"

const configSchema = Config.all({
	NODE_ENV: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
	LOG_LEVEL: Config.string("LOG_LEVEL").pipe(Config.withDefault("info")),
	VITE_PUBLIC_SERVER: Config.string("VITE_PUBLIC_SERVER"),
})

// Convert import.meta.env to a Map for ConfigProvider.fromMap()
const envMap = new Map(Object.entries(import.meta.env))

// Create provider from the env Map instead of process.env
const provider = ConfigProvider.fromMap(envMap).pipe(
	ConfigProvider.constantCase,
)
const loadConfig = provider.load(configSchema)

export const env = Effect.runSync(loadConfig)
