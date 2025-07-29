# zero-effect-better-t

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

This is a modified version of the template to add on the following features:

- Zero Sync
- Effect
- Alchemy

Huge shoutout to [@IzakFilmalter](https://x.com/IzakFilmalter) with [OpenFaith](https://github.com/FaithBase-AI/openfaith) for all of the legwork with integrating Effect and Zero together.

## Goals

- [ ] Backend logic leveraging Effect
- [ ] Drizzle for writing mutuations ('Effectful' usage of Drizzle) and Drizzle Kit for migrations
  - [Drizzle Effect Client](packages/backend/src/db/client.ts)
- [ ] Drizzle Zero to generate the Zero schema
- [ ] Zero for realtime sync on client(s) leveraging Effectful custom mutators
- [ ] [Alchemy](https://alchemy.run/) for running dev and deploying in production to Cloudflare Workers

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Email & password authentication with Better Auth
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Apply the schema to your database using Drizzle Kit:

```bash
bun db:push
```

Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Project Structure

```text
zero-effect-better-t/
├── apps/
│   ├── web/             # Frontend application (React + TanStack Start)
├── packages/
│   ├── backend/         # Backend code (Drizzle, Zero, etc.)
│   ├── env/             # Environment variables
│   ├── zero-effect/     # Effect compatible code to work with Zero - from @openfaith
│   ├── effect-bun-test/ # Effect Bun test code - from @openfaith
│   ├── tsconfig/        # TypeScript configuration
│   └── ...              # Other packages
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
- `bun check`: Run Biome formatting and linting

## Current Limitiations / Issues

- `createInsertSchema` and `createSelectSchema` from `@zero-effect/backend/lib/drizzle-effect` must be used and imported  with the same subpackage. If exported out the types end up as `any`.

## Todo

- [ ] Public/Private Routes to show login/auth behavior
- [ ] Add mobile app - waiting for [feat(zero-client): expo-sqlite storage](https://github.com/rocicorp/mono/pull/4669) to land
