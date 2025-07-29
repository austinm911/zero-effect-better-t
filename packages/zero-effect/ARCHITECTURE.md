# Zero-Effect Drizzle Architecture

## Overview

This package provides two Drizzle implementations for Zero-Effect integration:

- **Effect-SQL** (primary): Uses `@effect/sql-drizzle` with Effect's PgClient
- **Node-Postgres** (alternative): Uses direct `node-postgres` with Drizzle

Both follow Zero's custom mutator pattern with strict client/server separation.

## Architecture Principles

### **Client/Server Separation**

- **Client mutators**: Database-free, use Zero's Transaction API only
- **Server mutators**: Database-aware, authoritative implementations
- **Bundle safety**: No database code can leak into client bundles

### **Dual Implementation Strategy**

```
Entry Points:
├── index.ts          # Primary: Effect-SQL implementation
└── node.ts           # Alternative: Node-postgres implementation

Shared Code:
├── shared/
│   ├── client-mutators.ts    # Database-free client mutators
│   ├── types.ts              # Common types
│   └── errors.ts             # Error definitions

Server Implementations:
├── server/
│   ├── drizzle-effect.ts     # Effect-SQL server implementation
│   └── drizzle-node.ts       # Node-postgres server implementation
```

## Client Mutators (Shared)

**Database-Free Implementation:**

```typescript
// shared/client-mutators.ts
export function createClientMutators(auth: AuthData | undefined) {
  return {
    people: {
      update: (tx: EffectTransaction<Schema>, input: UpdateInput) =>
        Effect.gen(function* () {
          // 1. Client-side validation only
          if (!auth) yield* Effect.fail(new ZeroMutatorAuthError(...))
          
          // 2. Input validation with Effect Schema
          const validated = yield* Schema.decodeUnknown(UpdateSchema)(input)
          
          // 3. Use Zero's Transaction API (speculative)
          yield* tx.mutate.people.update(validated)
          
          // 4. Client-side logging
          yield* Effect.log('Person updated (client-side)', { id: validated.id })
        })
    }
  }
}
```

**Key Characteristics:**

- ✅ Zero database dependencies
- ✅ Pure Effect-TS validation and error handling
- ✅ Uses only Zero's Transaction interface
- ✅ Safe for client bundles

## Server Implementations

### **Effect-SQL Implementation** (Primary)

**Integration with Effect Ecosystem:**

```typescript
// server/drizzle-effect.ts
export class EffectDrizzleZeroStore extends Effect.Service<EffectDrizzleZeroStore>()(
  '@zero-effect/EffectDrizzleZeroStore',
  {
    effect: Effect.gen(function* () {
      const pgDrizzle = yield* Pg.PgDrizzle  // Effect-SQL Drizzle
      const runtime = yield* Effect.runtime<never>()
      
      return {
        forSchema: (schema) => ({
          processMutations: (effectMutators, urlParams, payload) =>
            Effect.gen(function* () {
              // Convert Effect → Promise for Zero
              const runtime = yield* Effect.runtime()
              const promiseMutators = convertEffectMutatorsToPromise(effectMutators, runtime)
              
              // Use Effect-SQL Drizzle processor
              const processor = zeroEffectDrizzleProcessor(schema, pgDrizzle, runtime)
              return yield* Effect.tryPromise(() => 
                processor.process(promiseMutators, urlParams, payload)
              )
            })
        })
      }
    })
  }
) {}
```

**Benefits:**

- ✅ Full Effect ecosystem integration
- ✅ Automatic connection pooling via Effect PgClient
- ✅ Built-in error handling with SqlError
- ✅ Service composition and dependency injection
- ✅ Tracing and observability
- ✅ Resource management and cleanup

### **Node-Postgres Implementation** (Alternative)

**Direct Database Access:**

```typescript
// server/drizzle-node.ts
export class NodeDrizzleZeroStore {
  constructor(
    private readonly drizzle: NodePgDatabase<any>,
    private readonly runtime: Runtime.Runtime<never>
  ) {}

  forSchema<TSchema extends Schema>(schema: TSchema) {
    return {
      processMutations: (effectMutators, urlParams, payload) =>
        Effect.gen(function* () {
          const runtime = yield* Effect.runtime()
          const promiseMutators = convertEffectMutatorsToPromise(effectMutators, runtime)
          
          // Use node-postgres Drizzle processor
          const processor = zeroEffectDrizzleProcessor(schema, this.drizzle, runtime)
          return yield* Effect.tryPromise(() => 
            processor.process(promiseMutators, urlParams, payload)
          )
        })
    }
  }
}
```

**Benefits:**

- ✅ Direct control over database connections
- ✅ Familiar node-postgres patterns
- ✅ Lower-level access when needed
- ✅ Easier migration from existing node-postgres code

## Server Mutators

**Extending Client Mutators:**

```typescript
export function createServerMutators(authData: AuthData | undefined) {
  const clientMutators = createClientMutators(authData)
  
  return {
    ...clientMutators,
    
    people: {
      ...clientMutators.people,
      
      // Extend with server-specific logic
      update: (tx: EffectTransaction<Schema>, input: UpdateInput) =>
        Effect.gen(function* () {
          // 1. Run shared client logic
          yield* clientMutators.people.update(tx, input)
          
          // 2. Add server-only features
          if (tx.location === 'server') {
            // Audit logging
            yield* Effect.log('Server: Person updated', { 
              userId: authData?.userId,
              personId: input.id 
            })
            
            // Business logic (notifications, webhooks, etc.)
            const notifyService = yield* NotifyService
            yield* notifyService.sendUpdateNotification(input.id)
          }
        })
    }
  }
}
```

## Usage Patterns

### **React Client** (Database-Free)

```tsx
import { createClientMutators, convertEffectMutatorsToPromise } from '@zero-effect'

function App() {
  const mutators = useMemo(() => {
    const effectMutators = createClientMutators(authData)
    return convertEffectMutatorsToPromise(effectMutators, Runtime.defaultRuntime)
  }, [authData])

  return <ZeroProvider mutators={mutators} schema={schema}>{children}</ZeroProvider>
}
```

### **Effect Server**

```typescript
import { EffectDrizzleZeroStore, createServerMutators } from '@zero-effect'

const handler = Effect.gen(function* () {
  const store = yield* EffectDrizzleZeroStore
  const schemaStore = store.forSchema(schema)
  
  return yield* schemaStore.processMutations(
    createServerMutators(authData),
    urlParams,
    payload
  )
}).pipe(Effect.provide(ServerLive))
```

### **Node Server**

```typescript
import { NodeDrizzleZeroStore, createServerMutators } from '@zero-effect/node'

const store = new NodeDrizzleZeroStore(drizzle, runtime)
const schemaStore = store.forSchema(schema)

await Effect.runPromise(
  schemaStore.processMutations(createServerMutators(authData), urlParams, payload)
)
```

## Key Differences

| Aspect | Effect-SQL | Node-Postgres |
|--------|------------|---------------|
| **Database Client** | `@effect/sql-drizzle` + `PgClient` | `drizzle-orm/node-postgres` |
| **Connection Management** | Automatic via Effect layers | Manual configuration |
| **Error Handling** | Built-in `SqlError` integration | Custom error wrapping |
| **Service Integration** | Native Effect service composition | Effect wrapper around node client |
| **Resource Management** | Automatic cleanup and pooling | Manual resource management |
| **Observability** | Built-in tracing and metrics | Custom instrumentation needed |
| **Type Safety** | Full Effect-TS integration | Effect wrapper around Promise API |

## Migration Path

1. **Start with Effect-SQL** (recommended for new projects)
2. **Use Node-Postgres** for existing node-postgres codebases
3. **Gradual migration** from Node to Effect implementation
4. **Same client mutators** work with both server implementations
