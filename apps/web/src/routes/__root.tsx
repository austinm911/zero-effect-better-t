import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import Loader from "@/components/loader"
import { Toaster } from "@/components/ui/sonner"
import type { RouterContext } from "@/router"
import Header from "../components/header"
import appCss from "../index.css?url"

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
})

function RootDocument() {
	const isFetching = useRouterState({ select: (s) => s.isLoading })

	return (
		<html lang='en' className='dark'>
			<head>
				<HeadContent />
			</head>
			<body>
				<div className='grid h-svh grid-rows-[auto_1fr]'>
					<Header />
					{isFetching ? <Loader /> : <Outlet />}
				</div>
				<Toaster richColors />
				<TanStackRouterDevtools position='bottom-left' />
				<Scripts />
			</body>
		</html>
	)
}
