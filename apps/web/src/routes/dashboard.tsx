import { createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
})

function RouteComponent() {
	const navigate = Route.useNavigate()
	const { data: session, isPending } = authClient.useSession()

	useEffect(() => {
		if (!session && !isPending) {
			navigate({
				to: "/login",
			})
		}
	}, [session, isPending])

	if (isPending) {
		return <div>Loading...</div>
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {session?.user.name}</p>
		</div>
	)
}
