# zero-effect-better-t

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

This is a modified version of the template to add on the following features:

- Zero Sync
- Effect
- Alchemy

Huge shoutout to [@IzakFilmalter](https://x.com/IzakFilmalter) with [OpenFaith](https://github.com/FaithBase-AI/openfaith) for all of the legwork with integrating Effect and Zero together.

>Note: I am learning Effect and using this project to try to better understand it so this is a work in progress.

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

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp env.example .env
   ```

3. **Start and set up the database container:**

   ```bash
   bun db:start
   ```

4. **Push database schema to database using Drizzle Zero and Drizzle Kit:**

   ```bash
   bun db:push
   ```

5. **Run the backend container in watch mode with Zero Cache for replication:**

   ```bash
   bun db:backend
   ```

6. **In a second terminal, start the web app's Vite dev server using Alchemy:**

   ```bash
   bun dev
   ```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.

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

### Development

- `bun dev`: Start the web application development server using Alchemy
- `bun db:start`: Start and set up the database container
- `bun db:backend`: Run the backend container in watch mode with Zero Cache for replication
- `bun db:push`: Push schema changes to database using Drizzle Zero and Drizzle Kit
- `bun db:studio`: Open database studio UI

### Build & Quality

- `bun build`: Build all applications
- `bun check-types`: Check TypeScript types across all apps
- `bun check`: Run Biome formatting and linting

### Deployment

- `bun deploy`: Deploy the web application to production using Alchemy

## Current Limitiations / Issues

- `createInsertSchema` and `createSelectSchema` from `@zero-effect/backend/lib/drizzle-effect` must be used and imported  with the same subpackage. If exported out the types end up as `any`.

## Todo

- [ ] Public/Private Routes to show login/auth behavior
- [ ] Add mobile app - waiting for [feat(zero-client): expo-sqlite storage](https://github.com/rocicorp/mono/pull/4669) to land
