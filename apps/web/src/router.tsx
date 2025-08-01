import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import Loader from "./components/loader"
import "./index.css"
import type { ZeroClient } from "@zero-effect/backend/zero"
import { routeTree } from "./routeTree.gen"

export interface RouterContext {
	zero: ZeroClient
}

export const createRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: {
			zero: undefined as unknown as ZeroClient, // populated in ZeroInit
		} satisfies RouterContext,
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: () => <div>Not Found</div>,
		Wrap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	})
	return router
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>
	}
}
