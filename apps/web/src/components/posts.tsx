import { faker } from "@faker-js/faker"
import { useQuery } from "@rocicorp/zero/react"
import type { ZeroClient } from "@zero-effect/backend/zero"
import { Button } from "@/components/ui/button"

export function PostsComponent({ zero }: { zero: ZeroClient }) {
	const [posts] = useQuery(zero.query.posts, {
		ttl: "1m",
	})

	/**
	 * Handle adding a new post with random data using custom mutators
	 */
	const handleAddPost = () => {
		// 	// TODO: not type safe
		zero.mutate.posts.add({
			id: faker.number.int({ min: 1, max: 1000 }),
			title: faker.lorem.sentence(),
			content: faker.lorem.paragraphs(2),
			published: faker.datatype.boolean(),
			authorId: faker.string.uuid(),
		})
		console.log(`zero : ${JSON.stringify(zero)}`)
		console.log(`posts: ${posts}`)
		console.log("🚀 ~ handleAddPost ~ posts:", posts)
	}

	/**
	 * Handle removing a random post using custom mutators
	 */
	const handleRemovePost = () => {
		const randomPost = posts?.[Math.floor(Math.random() * posts.length)]
		if (randomPost?.id) {
			// TODO: not type safe
			zero.mutate.posts.remove({
				id: randomPost.id,
			})
		}
	}

	return (
		<div className='space-y-4'>
			{/* Action buttons row */}
			<div className='flex gap-2'>
				<Button onClick={handleAddPost} variant='default'>
					Add Post
				</Button>
				<Button onClick={handleRemovePost} variant='destructive'>
					Remove Post
				</Button>
			</div>

			{/* Posts container */}
			<div className='rounded-lg border p-4'>
				<h2 className='mb-4 font-medium'>Posts ({posts?.length || 0})</h2>

				{/* Scrollable posts list */}
				<div className='max-h-96 space-y-4 overflow-y-auto'>
					{posts?.length === 0 ? (
						<p className='py-8 text-center text-muted-foreground'>
							No posts found. Click "Add Post" to create some!
						</p>
					) : (
						posts?.map((post) => (
							<article
								key={post.id}
								className='space-y-3 rounded-lg border p-4'
							>
								{/* Post header */}
								<div className='space-y-1'>
									<h3 className='font-medium text-lg'>{post.title}</h3>
									<p className='text-muted-foreground text-sm'>
										By {post.authorId} •{" "}
										{post.createdAt
											? new Date(post.createdAt).toLocaleDateString()
											: "Unknown date"}
									</p>
								</div>

								{/* Post content */}
								<p className='text-sm leading-relaxed'>{post.content}</p>

								{/* Tags - Simplified version without tag fetching */}
								<div className='flex flex-wrap gap-1'>
									<span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-1 font-medium text-primary text-xs'>
										Demo Tag
									</span>
								</div>

								{/* Post status */}
								<div className='flex items-center gap-2'>
									<span
										className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs ${
											post.published
												? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
												: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
										}`}
									>
										{post.published ? "Published" : "Draft"}
									</span>
								</div>
							</article>
						))
					)}
				</div>
			</div>
		</div>
	)
}
