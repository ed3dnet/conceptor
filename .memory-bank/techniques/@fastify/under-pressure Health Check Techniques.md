---
title: '@fastify/under-pressure Health Check Techniques'
type: note
permalink: techniques/fastify/under-pressure-health-check-techniques
tags:
- '["fastify"'
- '"health-check"'
- '"tooling"]'
---

# @fastify/under-pressure Health Check Techniques

## Core Health Check Methods

### 1. Checking System Pressure
- Use `fastify.isUnderPressure()` to programmatically check system load
- Returns a boolean indicating if the system is under pressure

```typescript
// Example usage in a route handler
if (fastify.isUnderPressure()) {
  // Skip complex computations or handle load
}
```

### 2. Exposing Status Route
- Configure `exposeStatusRoute` to automatically add a health check endpoint
- Customizable route path and options

```typescript
fastify.register(require('@fastify/under-pressure'), {
  exposeStatusRoute: {
    url: '/alive', // Custom route path
    routeOpts: {
      logLevel: 'debug'
    }
  }
})
```

### 3. Custom Health Check Function
- Implement custom `healthCheck` for complex system health verification
- Allows checking external resource status

```typescript
fastify.register(require('@fastify/under-pressure'), {
  healthCheck: async function (fastifyInstance) {
    // Check database connection, external service health, etc.
    return true // or detailed health object
  },
  healthCheckInterval: 500 // Optional interval for repeated checks
})
```

## Key Considerations
- Monitors event loop delay, memory usage
- Automatically handles "Service Unavailable" responses
- Provides both programmatic and HTTP endpoint health checks

## Implementation Location
Implemented in `apps/central/src/_api/routes/meta/routes.ts`

## Package Version
@fastify/under-pressure v9.0.3