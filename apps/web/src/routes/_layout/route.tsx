import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ZeroInit } from "@/zero/zero-init"

export const Route = createFileRoute("/_layout")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<ZeroInit>
			<Outlet />
		</ZeroInit>
	)
}
