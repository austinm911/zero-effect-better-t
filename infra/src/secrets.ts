import { env } from "@zero-effect/env/server"
import { secret } from "alchemy"
import { Redacted } from "effect"

const apiToken = secret(Redacted.value(env.CLOUDFLARE_API_TOKEN))
const alchemyStateToken = secret(Redacted.value(env.ALCHEMY_STATE_TOKEN))

export const secrets = {
	apiToken,
	alchemyStateToken,
}
