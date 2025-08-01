import { createFileRoute, useRouter } from "@tanstack/react-router"
import { PostsComponent } from "@/components/posts"

export const Route = createFileRoute("/_layout/")({
	component: HomeComponent,
})

function HomeComponent() {
	const router = useRouter()
	const { zero } = router.options.context
	return (
		<div className='container mx-auto max-w-3xl px-4 py-2'>
			<div className='grid gap-6'>
				<section className='rounded-lg border p-4'>
					<h2 className='mb-2 font-medium'>Posts Management</h2>
					<PostsComponent zero={zero} />
				</section>
			</div>
		</div>
	)
}
