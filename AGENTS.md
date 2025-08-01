# Agent Guidelines

## Build/Test Commands
- **Build**: `bun run build` (root), `turbo build` (all packages)
- **Lint**: `bun run check` (root), `biome check --write` (individual packages)
- **Type check**: `bun run check-types` (root), `tsc -b` or `tsc --noEmit` (packages)
- **Test**: `bun test` (packages with tests), `bun test <filename>` (single test)
- **Dev**: `bun run dev` (full stack), `bun run dev:web` (frontend only)

## Code Style
- **Formatter**: Biome with tab indentation, double quotes, semicolons as needed
- **Imports**: Use workspace aliases (`@/`, `@zero-effect/`), organize imports automatically
- **Types**: Prefer `type` over `interface`, use Effect Schema for validation
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Components**: Default exports, props destructuring, use `cn()` for className merging
- **Error handling**: Use Effect error types (`TaggedError`), avoid throwing exceptions
- **Comments**: Minimal comments, use JSDoc for public APIs only
- **Files**: `.ts` for logic, `.tsx` for React components

## Architecture
- Effect-based functional programming with Zero sync engine
- Monorepo with Turbo, Bun package manager
- React + TanStack Router frontend, Drizzle ORM backend
- Client/server service pattern with tagged unions