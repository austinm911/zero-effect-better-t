import { useQuery } from "@rocicorp/zero/react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import type { Zero } from "@zero-effect/backend/zero"
import { ZeroInit } from "@/zero/zero-init"

export const Route = createFileRoute("/")({
	component: ZeroComponent,
})

function ZeroComponent() {
	return (
		<ZeroInit>
			<HomeComponent />
		</ZeroInit>
	)
}

function query(z: Zero) {
	return z.query.posts
}

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `

function HomeComponent() {
	const router = useRouter()
	const { zero } = router.options.context

	const [posts] = useQuery(query(zero), {
		ttl: "5m",
	})
	return (
		<div className='container mx-auto max-w-3xl px-4 py-2'>
			<pre className='overflow-x-auto font-mono text-sm'>{TITLE_TEXT}</pre>
			<div className='grid gap-6'>
				<section className='rounded-lg border p-4'>
					<h2 className='mb-2 font-medium'>API Status</h2>
				</section>

				{/* Zero */}
				<section className='rounded-lg border p-4'>
					<h2 className='mb-2 font-medium'>Zero</h2>
					<pre>{JSON.stringify(posts, null, 2)}</pre>
				</section>
			</div>
		</div>
	)
}
