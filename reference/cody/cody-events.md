# Conceptor Events System

This document provides an overview of the events system in Conceptor, explaining how events are defined, dispatched, and handled throughout the application.

## Core Components

The events system consists of several key components:

1. **Event Schemas**: Type definitions for event payloads
2. **Event Registry**: Central registry mapping event types to their schemas
3. **Event Listeners**: Functions that respond to specific event types
4. **Event Service**: Service that dispatches events to registered listeners
5. **CLI Commands**: Command-line interface for manually triggering events
6. **Temporal Workflows**: Long-running processes triggered by events

## Key Files to Request

To understand and work with the events system, request these files:

- `apps/central/src/domain/events/event-schemas.ts` - Core event payload definitions
- `apps/central/src/domain/events/event-registry.ts` - Registry connecting event types to schemas
- `apps/central/src/domain/events/service.ts` - Service for dispatching events
- `apps/central/src/_cli/fire-event/index.ts` - CLI command structure for events
- `apps/central/src/_cli/fire-event/hourly-trigger.ts` - Example CLI event trigger
- `apps/central/src/_worker/activities/hourly-trigger.activity.ts` - Example event activity
- `apps/central/src/_worker/workflows/core/hourly-trigger.workflow.ts` - Example event workflow
- `apps/central/src/_worker/schedules.ts` - Temporal scheduled workflows
- `apps/central/src/domain/users/service.ts` - Example domain service that might emit events
- `apps/central/src/domain/users/events.ts` - Example domain-specific event definitions

## Event Definition Pattern

Events in Conceptor follow these key principles:

1. **Domain Ownership**: Define events alongside the service that owns them
   - For example, user-related events should be defined in `apps/central/src/domain/users/events.ts`
   - This keeps event definitions close to the code that generates them

2. **Tenant Context**: Events should almost always include a tenant ID
   - This ensures proper multi-tenancy isolation
   - Enables tenant-specific event handling and filtering

3. **Discriminated Union**: Each event has a unique `__type` literal that identifies it
   - Event schemas are defined using TypeBox for runtime validation
   - All events are collected in a union type for type-safe handling

Example domain-specific event schema:
```typescript
// In apps/central/src/domain/users/events.ts
export const UserCreatedEvent = Type.Object({
  __type: Type.Literal("UserCreated"),
  tenantId: Type.String({ format: "uuid" }), // Always include tenantId
  userId: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  timestamp: Type.String({ format: "date-time" })
});
export type UserCreatedEvent = Static<typeof UserCreatedEvent>;
```

## Event Registry

The event registry imports events from all domains and provides type-safe access:

1. Domain-specific events are exported from their respective modules
2. The central registry imports and collects all events
3. A union type is created from these schemas
4. TypeScript's type system ensures type safety throughout

## Event Listeners

Event listeners can be registered for specific event types:

1. Listeners are organized by event type in a registry
2. Each listener has a unique name and a handler function
3. The handler function is strongly typed to the event's payload
4. Multiple listeners can be registered for a single event type
5. Listeners can filter events by tenantId when appropriate

## Event Service

The `EventService` handles event dispatching:

1. It validates events against their schema
2. It finds all listeners registered for the event type
3. It dispatches the event to each listener
4. It handles errors from individual listeners
5. It respects tenant boundaries for multi-tenant isolation

## CLI Integration

Events can be triggered manually via CLI commands:

1. Each event type has a corresponding CLI command
2. Commands are organized in the `fire-event` directory
3. Commands use the application's DI container to access the event service
4. Commands provide feedback via logging
5. CLI commands should require tenantId for tenant-specific events

Example CLI usage:
```bash
pnpm app-cli fire-event user-created --tenant-id 123e4567-e89b-12d3-a456-426614174000
```

## Adding a New Event

To add a new event to the system:

1. Define the event schema in the appropriate domain directory (e.g., `users/events.ts`)
2. Always include a tenantId field (except for system-wide events)
3. Export the event schema from the domain module
4. Import and add it to the `ALL_EVENTS` array in the central registry
5. Create any necessary event listeners
6. Add a CLI command for manual triggering if needed
7. Create Temporal workflows/activities that respond to the event

## Example: User Service Events

For a user service, you might have:

```typescript
// apps/central/src/domain/users/events.ts
import { Type, type Static } from "@sinclair/typebox";

export const UserCreatedEvent = Type.Object({
  __type: Type.Literal("UserCreated"),
  tenantId: Type.String({ format: "uuid" }),
  userId: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  timestamp: Type.String({ format: "date-time" })
});
export type UserCreatedEvent = Static<typeof UserCreatedEvent>;

export const UserUpdatedEvent = Type.Object({
  __type: Type.Literal("UserUpdated"),
  tenantId: Type.String({ format: "uuid" }),
  userId: Type.String({ format: "uuid" }),
  timestamp: Type.String({ format: "date-time" }),
  changedFields: Type.Array(Type.String())
});
export type UserUpdatedEvent = Static<typeof UserUpdatedEvent>;
```

Then in the user service:

```typescript
// In UserService.createUser method
await this.events.dispatchEvent({
  __type: "UserCreated",
  tenantId: user.tenantId,
  userId: user.userId,
  email: user.email,
  timestamp: new Date().toISOString()
});
```

This approach keeps event definitions close to the services that emit them while maintaining a centralized registry for type safety and discovery.
