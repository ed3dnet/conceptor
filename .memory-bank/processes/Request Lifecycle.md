---
title: Request Lifecycle
type: note
permalink: processes/request-lifecycle
tags:
- '["fastify"'
- '"request-lifecycle"'
- '"authentication"'
- '"validation"'
- '"security"'
- '"multi-tenant"'
- '"dependency-injection"]'
---

# Request Lifecycle

## Overview
Complete request processing pipeline from HTTP reception through domain validation, authentication, and response generation.

## Request Pipeline

### 1. HTTP Server Setup
**Fastify Configuration**:
- TypeBox type provider for compile-time API schema validation
- Request ID generation with `API-{timestamp}-{random}`
- Structured logging with Pino logger child contexts
- CORS enabled for frontend and API base URLs

**Security Middleware**:
- Helmet for security headers (CSP disabled, HSTS disabled for development)
- Cookie support for session management
- OpenAPI 3.1 with Scalar UI (non-production only)

### 2. Request Initialization
**onRequest Hook**:
```typescript
// 1. Dependency injection scope creation
const scope = await configureRequestAwilixContainer(config, request.log, fastify.diContainer);
request.diScope = scope;
request.deps = scope.cradle; // Direct access to services

// 2. Request-scoped services include:
// - Domain services (users, tenants, auth, etc.)
// - Database connections (scoped for request lifecycle) 
// - Logger with request context
```

**Request Context**:
- Trace ID generated from X-Request-ID header or generated
- Request-scoped dependency injection container
- Dedicated logger child with request context

### 3. Route Matching and Schema Validation
**TypeBox Schema Validation**:
```typescript
// Route definition with compile-time types
fastify.get<{
  Params: { tenantIdOrSlug: string },
  Querystring: { redirectUri?: string }
}>("/api/:tenantIdOrSlug/resource", {
  schema: {
    params: Type.Object({ tenantIdOrSlug: Type.String() }),
    querystring: Type.Object({ redirectUri: Type.Optional(Type.String()) }),
    response: { 200: ResourceResponse }
  }
});
```

**Validation Process**:
- Custom AJV compiler with TypeBox custom keywords
- Request parameter, query, and body validation
- Response schema validation (development mode)
- 400 errors for validation failures with detailed messages

### 4. Authentication and Authorization

#### Tenant-User Cookie Authentication
**Security Handler Process**:
```typescript
// 1. Extract tenant from URL parameter
const { tenantIdOrSlug } = request.params;

// 2. Tenant resolution with caching
const tenant = await memorySWR(`tenants:${tenantIdOrSlug}`, 
  () => request.deps.tenants.getByIdOrSlug(tenantIdOrSlug),
  { maxTimeToLive: 10000, minTimeToStale: 1000 }
);

// 3. Session token validation
const user = await auth.resolveSessionTokenToUser(cookieValue);

// 4. Cross-tenant validation
if (user.tenantId !== tenant.tenantId) {
  return { ok: false, code: 401 };
}

// 5. Request context injection
request.tenant = tenant; // Readonly after set
request.user = user;     // Readonly after set
```

**Authentication Flow**:
- Session cookie extracted by security scheme
- SHA256 token hash lookup in database
- Session expiration and user status validation
- Automatic session timestamp updates
- Multi-tenant isolation enforcement

### 5. Handler Execution

#### Protected Route Pattern
**uH() Helper**:
```typescript
// Type-safe handler with guaranteed user/tenant context
const handler = uH(async (user, tenant, request, reply) => {
  // user and tenant guaranteed to be populated
  return request.deps.users.getUserPrivate(UserIds.toRichId(user.userId));
});
```

#### Service Layer Interaction
**Domain Service Access**:
```typescript
// Request-scoped services via dependency injection
const { users, tenants, auth, authConnectors } = request.deps;

// All operations scoped by tenant context
const userProfile = await users.withUserById(userId, async (user) => {
  // Validated user operations
  return users.toPublicUser(user);
});
```

### 6. Response Generation

#### Success Response
- Schema validation of response payload (development)
- Automatic rich ID conversion for external APIs
- Structured JSON responses with type safety

#### Error Handling
**Comprehensive Error Pipeline**:
```typescript
// ApplicationError hierarchy
if (err instanceof ApplicationError) {
  reply.code(err.httpStatusCode);
  return {
    error: true,
    code: err.httpStatusCode,
    name: err.friendlyName,
    message: err.message,
    reqId: request.id,
    traceId: request.traceId,
    stack: config.http.emitStackOnErrors ? err.stack : undefined
  };
}

// Validation errors  
if (err.validation) {
  return {
    error: true,
    code: 400,
    name: "ValidationError", 
    message: "Invalid request: " + err.message,
    details: err.validation
  };
}
```

### 7. Session Management

#### Cookie Configuration
```typescript
const cookieOptions = {
  httpOnly: true,
  secure: config.auth.sessionCookie.secure,
  sameSite: "strict" as const,
  domain: config.auth.sessionCookie.domain,
  maxAge: config.auth.sessionCookie.maxAgeMs / 1000,
  path: "/"
};
```

#### Session Security
- HTTPOnly cookies prevent XSS access
- Secure flag for HTTPS-only transmission
- SameSite strict for CSRF protection
- Domain-scoped for subdomain isolation
- Sliding expiration with database tracking

## Security Boundaries

### Multi-Tenant Isolation
- All operations validated against tenant context
- Cross-tenant access prevented at security layer
- Session tokens scoped to tenant boundaries
- Rich IDs include tenant context validation

### Request-Response Security
- Input validation with TypeBox schemas
- SQL injection prevention via parameterized queries
- Output sanitization through schema validation
- Error message sanitization (no internal details exposed)

## Performance Optimizations

### Caching Layers
- **Memory SWR**: Tenant lookup caching (10s TTL, 1s stale)
- **Database Connection Pooling**: Singleton read/write pools
- **Request Scoping**: Services created per request, not per operation

### Database Strategy
- Read/write replica separation (DrizzleRO vs Drizzle)
- Connection pooling with configurable sizing
- Query logging with configurable levels
- Transaction scoping for data consistency

## Error Recovery

### Graceful Degradation
- Database connection failures logged and re-thrown
- Individual request failures don't affect other requests  
- Authentication failures return standard 401 responses
- Validation errors provide detailed feedback for debugging

### Monitoring Integration
- Structured logging with trace IDs
- Error categorization and metrics
- Request timing and performance tracking
- Security event logging for authentication failures

## Observations
- [concept] Complete request lifecycle orchestrates authentication, tenant validation, schema validation, and domain service execution in a type-safe pipeline #request-lifecycle #type-safety #authentication #tenant-isolation
- [technique] Dependency injection with request-scoped containers enables clean service layer access with proper logging context #dependency-injection #request-scoping #awilix
- [pattern] Multi-layered security with schema validation, session authentication, and tenant isolation provides defense in depth #security-layers #validation #tenant-isolation
- [detail] uH() helper function provides type-safe guaranteed user/tenant context for protected route handlers #type-safety #protected-routes #helper-functions

## Relations
- orchestrates [[Login Flow Process]]
- validates [[Auth Domain]]
- enforces [[Tenants Domain]] 
- secures [[Users Domain]]
- integrates [[Central Database Architecture]]
- implements [[Multi-Tenant Architecture]]
- uses [[Rich IDs Usage Guide]]