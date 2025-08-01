import {
	FetchHttpClient,
	HttpApiBuilder,
	HttpApiSwagger,
	HttpLayerRouter,
	HttpServer,
} from "@effect/platform"
import { Layer } from "effect"
import { Database } from "@/db/client"
import { ZeroHandlerLive } from "../handlers/zero"
import { ZeroMutatorsApi } from "../index"

// Create the handlers layer with basic dependencies
const HandlersLayer = Layer.mergeAll(ZeroHandlerLive).pipe(
	Layer.provide(FetchHttpClient.layer),
	Layer.provide(Database.Live),
)

// Create the Zero HTTP API route using HttpLayerRouter
export const HttpApiRoute = HttpLayerRouter.addHttpApi(ZeroMutatorsApi, {
	openapiPath: "/api/openapi.json",
}).pipe(Layer.provide(HandlersLayer), Layer.provide(HttpServer.layerContext))

export const ApiLive = HttpApiBuilder.api(ZeroMutatorsApi).pipe(
	Layer.provide(HandlersLayer),
)

export const SwaggerLayer = HttpApiSwagger.layer({
	path: "/api/docs",
}).pipe(Layer.provide(ApiLive))

// Main server layer that includes Core, Adapter, Zero, and Swagger together
export const ServerLive = Layer.mergeAll(
	HttpApiRoute,
	SwaggerLayer,
	HttpServer.layerContext,
)
