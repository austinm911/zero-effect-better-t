import { join } from "node:path"
import alchemy from "alchemy"
import { TanStackStart } from "alchemy/cloudflare"
import { CloudflareStateStore, FileSystemStateStore } from "alchemy/state"
import { secrets } from "./secrets"

const stage = process.env.NODE_ENV === "production" ? "prod" : "dev"

const projectRoot = join(import.meta.dir, "../..")

const app = await alchemy("zero-effect", {
	password: secrets.alchemyStateToken.unencrypted,
	stage,
	stateStore: (scope) => {
		if (stage === "prod") {
			return new CloudflareStateStore(scope, {
				scriptName: "zero-effect-alchemy-state",
				apiToken: secrets.apiToken,
			})
		}
		return new FileSystemStateStore(scope, {
			rootDir: join(import.meta.dir, "../.alchemy"),
		})
	},
})

// Todo: This is where KV, Durable Objects, etc. could be added

const web = await TanStackStart("zero-effect-website", {
	name: `${app.name}-${app.stage}-zero-effect-website`,
	apiToken: secrets.apiToken,
	command: "bun run build",
	dev: { command: "bun run dev" },
	cwd: join(projectRoot, "apps/web"),
	compatibility: "node",
	compatibilityDate: "2025-07-29",
	bindings: {
		// TODO: Add bindings here
		// KV: {
		// },
	},
})

console.log({
	url: web.url,
})

if (stage === "prod") {
	await app.finalize()
}
