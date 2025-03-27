# Panel Application Guide

Panel is our web application that consumes the Central API server. It's built with React, TypeScript, and a modern frontend stack.

## Technology Stack

- **React**: Frontend library for building user interfaces
- **TypeScript**: Static typing for JavaScript
- **Vite**: Build tool and development server
- **React Router v7**: Client-side routing with data loading capabilities
- **TanStack Query**: Data fetching, caching, and state management
- **Tailwind CSS**: Utility-first CSS framework
- **DaisyUI**: Component library built on top of Tailwind
- **openapi-fetch**: Typed API client generated from OpenAPI specs

## Application Structure

The application follows a route-based directory structure that mirrors the URL paths:

```
apps/panel/src/
├── api/
│   ├── central-client.ts    # API client configuration
│   └── query-client.ts      # React Query client setup
├── components/              # Shared UI components
├── hooks/                   # Custom React hooks
├── layouts/                 # Layout components
├── routes/                  # Route components
│   ├── :tenantSlug/         # Tenant-specific routes
│   │   ├── context.ts       # Tenant context definition
│   │   ├── _login.tsx       # Login page component
│   │   ├── layout.tsx       # Tenant layout with auth logic
│   │   └── dashboard/       # Dashboard route
│   │       └── index.tsx    # Dashboard page component
│   └── not-found-page.tsx   # 404 page
├── router.tsx               # React Router configuration
└── main.tsx                 # Application entry point
```

## Tenant-Based Routing

All users access the application through a tenant-specific URL:

- Root path (`/`) shows a landing page prompting users to enter a tenant slug
- Tenant routes (`/:tenantSlug/*`) are protected by authentication
- The tenant layout component handles authentication and provides tenant context

## Authentication Flow

1. When a user visits a tenant URL, we check if they're authenticated
2. If not authenticated, we show a login page with available auth connectors
3. When a connector is selected, we redirect to the Central API's login endpoint
4. After successful authentication, the API sets a cookie and redirects back
5. The tenant layout detects the cookie and shows the authenticated content

## API Integration

### API Client Setup

We use `openapi-fetch` with types from `@myapp/central-client`:

```typescript
import { createClient } from 'openapi-fetch';
import type { paths } from '@myapp/central-client';

export const centralApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  credentials: 'include',
});
```

### Making API Calls

When making API calls, follow these conventions:

1. Use the path template string exactly as defined in the OpenAPI spec
2. Provide parameters through the `params` object
3. Never use string interpolation in the URL path

```typescript
// Correct way to make an API call
const response = await centralApiClient.GET(`/{tenantIdOrSlug}/me`, {
  params: {
    path: {
      tenantIdOrSlug: tenantSlug
    }
  }
});

// Incorrect - don't use string interpolation
// const response = await centralApiClient.GET(`/${tenantSlug}/me`);
```

### Accessing Types

Types from the Central API are available through `@myapp/central-client`:

```typescript
import { type schemas } from '@myapp/central-client';

// Use specific schema types
type UserPrivate = schemas['UserPrivate'];
type TenantPublic = schemas['TenantPublic'];
```

## Data Fetching with React Query

We use TanStack Query (React Query) for data fetching and caching:

```typescript
const userQuery = useQuery({
  queryKey: ['currentUser', tenantSlug],
  queryFn: async () => {
    const response = await centralApiClient.GET(`/{tenantIdOrSlug}/me`, {
      params: {
        path: {
          tenantIdOrSlug: tenantSlug
        }
      }
    });
    
    if (response.error) {
      return null;
    }
    
    return response.data;
  },
  retry: false
});
```

Important React Query patterns:
- Use consistent query keys for caching (`['entity', id]`)
- Handle loading and error states explicitly
- Set appropriate stale times and refetch intervals
- Use `enabled` to control when queries run

## Context and Data Sharing

We use React Router's outlet context to share data between layouts and child routes:

```typescript
// In layout.tsx
<Outlet context={{ currentUser: userQuery.data }} />

// In a child component
import { useTenantContext } from '../context';

function ChildComponent() {
  const { currentUser } = useTenantContext();
  // Use currentUser data
}
```

Define context types in a `context.ts` file adjacent to the layout that creates it:

```typescript
// context.ts
export type TenantLayoutContext = {
  currentUser: UserPrivate;
};
```

## Error Handling

Use the `useErrorHandler` hook for centralized error handling:

```typescript
const { handleError } = useErrorHandler();

try {
  // API call or other operation
} catch (error) {
  handleError(error, 'User-friendly error message');
}
```

This approach:
- Shows toast notifications to users
- Logs detailed errors during development
- Provides integration points for error tracking services

## Lazy Loading

React Router v7 uses a specific pattern for lazy loading:

```typescript
{
  path: 'dashboard',
  lazy: () => import('./routes/:tenantSlug/dashboard/index.tsx').then(module => ({
    Component: module.default
  }))
}
```

Alternatively, export a Component directly from your route module:

```typescript
// dashboard/index.tsx
export function Component() {
  // Component implementation
}

// In router.tsx
{
  path: 'dashboard',
  lazy: () => import('./routes/:tenantSlug/dashboard/index.tsx')
}
```

## Common Gotchas

1. **API Path Parameters**: Always use the path template and provide parameters through `params.path`, never through string interpolation.

2. **React Router Context**: Use custom hooks like `useTenantContext()` to access context with proper typing.

3. **Lazy Loading**: Remember that lazy-loaded routes in React Router v7 need to export a Component or return an object with a Component property.

4. **Environment Variables**: In Vite, use `import.meta.env.VITE_*` for custom environment variables, but `process.env.NODE_ENV` is also available.

5. **File Naming**: Use spine-case for filenames (e.g., `central-client.ts` not `centralClient.ts`).

6. **Type Imports**: Use explicit type imports to avoid bundling type-only imports: `import type { Something } from 'somewhere'`.

## Testing

When testing components:
- Prefer explicit props over context or React Query cache access
- Mock API responses at the fetch level
- Use React Testing Library for component tests
- Test loading, error, and success states

## Development Environment

- Vite's development server handles HMR and fast rebuilds
- The `allowedHosts` setting in Vite config only affects development, not production
- In production, host filtering should be handled by the reverse proxy
