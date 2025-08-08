---
title: Rich IDs Usage Guide
type: note
permalink: docs/rich-ids-usage-guide
tags:
- '["rich-id"'
- '"typescript"'
- '"api-design"'
- '"uuid"'
- '"ulid"'
- '"type-safety"]'
---

# Rich IDs Usage Guide

## Overview
Rich IDs provide human-readable, sortable, globally unique identifiers for external API consumption while using UUIDs internally for database operations.

## Format
Rich IDs follow the pattern: `{prefix}-{ULID}`
- Example: `user-01H2XVNZ7C9NXWK3TMCRD9QWMN`
- Example: `tenant-01H2XVNZ7C9NXWK3TMCRD9QWMN`

## TypeScript Implementation

### 1. Domain ID Definition
Each domain defines its ID type and utilities:

```typescript
// apps/central/src/domain/users/id.ts
import { createRichIdUtils, type RichId } from "../../lib/utils/rich-id.js";

export type UserId = RichId<"user">;
export const UserIds = createRichIdUtils("user");
```

### 2. Type Safety
Rich IDs are branded types - they're strings but TypeScript enforces the prefix:

```typescript
function getUserById(userId: UserId): Promise<User> {
  // userId is guaranteed to be "user-{ULID}" format
  const uuid = UserIds.toUUID(userId); // Convert to UUID for DB query
}

// This would cause a TypeScript error:
const tenantId: TenantId = "tenant-01H2XVNZ...";
getUserById(tenantId); // ❌ Type error: TenantId not assignable to UserId
```

### 3. Conversion Utilities
Each domain gets automatic conversion utilities:

```typescript
// Database operations (internal UUIDs)
const dbUser = await db.select().from(USERS)
  .where(eq(USERS.userId, UserIds.toUUID(userId)));

// API responses (external Rich IDs)  
return {
  userId: UserIds.toRichId(dbUser.userId),
  tenantId: TenantIds.toRichId(dbUser.tenantId)
};

// Type guards
if (UserIds.guard(someString)) {
  // someString is now typed as UserId
}
```

### 4. Schema Integration
Rich IDs integrate with TypeBox for API validation:

```typescript
// Automatic OpenAPI schema generation
export const UserPublic = schemaType("UserPublic", Type.Object({
  __type: Type.Literal("UserPublic"),
  userId: UserIds.TRichId,        // Validates "user-{ULID}" format
  tenantId: TenantIds.TRichId,    // Validates "tenant-{ULID}" format
  displayName: Type.String(),
}));
```

## Key Benefits

### Type Safety
- Prevents mixing IDs between domains
- Compile-time validation of ID formats
- IntelliSense support for conversion utilities

### External API Clarity
- Self-documenting resource types in URLs: `/users/user-01H2X...`
- Sortable by creation time (ULID property)
- No UUID exposure in external APIs

### Internal Efficiency  
- UUIDs in database for standard indexing/foreign keys
- Automatic conversion at service boundaries
- Consistent patterns across all domains

## Observations
- [technique] Rich IDs combine resource prefix with ULID for external-facing identifiers while using UUIDs internally #rich-id #uuid #ulid #api-design
- [pattern] Each domain defines its own typed ID using `createRichIdUtils()` for consistent conversion utilities #typescript #domain-driven-design
- [technique] TypeScript branded types prevent accidental ID mixing between domains (e.g., UserIds vs TenantIds) #type-safety
- [integration] TypeBox schemas automatically validate rich ID format in API endpoints #validation #openapi

## Relations
- implements [[Central Database Architecture]]
- part_of [[Central Project Architecture]]
- enables [[API Design Patterns]]