---
title: Health Check System Implementation
type: note
permalink: implementations/health-check-system-implementation
tags:
- '["fastify"'
- '"health-check"'
- '"monitoring"'
- '"under-pressure"'
- '"database"'
- '"redis"'
- '"temporal"'
- '"api"'
- '"schema"'
- '"central"]'
---

# Health Check System Implementation

## Context
Implemented a comprehensive health check system for the Central Fastify application using @fastify/under-pressure v9.0.3. This provides both system resource monitoring and custom health checks for external services.

## Implementation Details

### Observations
- [technique] Health monitoring using @fastify/under-pressure plugin provides system resource limits and custom health checks in `apps/central/src/_api/health.ts:18-114` #fastify #monitoring #health-check
- [technique] Database health checks use lightweight `SELECT 1` queries on both readonly and readwrite Drizzle connections in `apps/central/src/_api/health.ts:26-55` #database #drizzle
- [technique] Redis health check uses simple `ping()` method for connectivity verification in `apps/central/src/_api/health.ts:57-69` #redis
- [technique] Temporal health check uses `getSystemInfo()` API call to verify client connectivity in `apps/central/src/_api/health.ts:71-83` #temporal
- [technique] Health endpoint at `/meta/health` follows project schema patterns with TypeBox response types in `apps/central/src/_api/routes/meta/routes.ts:24-72` and `apps/central/src/_api/routes/meta/schemas.ts:12-37` #api #schema
- [decision] System resource limits configured with sane defaults (1GB heap, 1.5GB RSS, 1s event loop delay) to avoid requiring environment file changes in `apps/central/src/_api/health.ts:20-22` #config
- [technique] Health plugin registered early in Fastify server setup, after dependency injection but before main routes in `apps/central/src/_api/http/index.ts:144` #server-setup
- [technique] Error handling includes proper logging with component tags and graceful failure handling throughout health check functions #error-handling

### Configuration
- [detail] Health configuration added to AppConfig type with optional thresholds (maxEventLoopDelayMs, maxHeapMB, maxRssMB) in `apps/central/src/_config/types.ts:36-43` and integrated into main config at line 66 #config #typescript
- [detail] Environment-aware metrics endpoint exposure (disabled in production for security) in `apps/central/src/_api/health.ts:113` #security #environment

### Architecture Integration
- [technique] Health plugin accepts RootContainer from dependency injection system and accesses services via `container.cradle` in `apps/central/src/_api/health.ts:15-16` #dependency-injection #awilix
- [technique] Health endpoint integrated into existing `/apps/central/src/_api/routes/meta/routes.ts` following project patterns instead of inline route definition #architecture #routes
- [technique] Response schemas defined in `apps/central/src/_api/routes/meta/schemas.ts:12-37` using TypeBox pattern for `HealthResponse` and `HealthErrorResponse` types #schema #typescript

### Files Created/Modified
- Created: `apps/central/src/_api/health.ts` - Main health plugin implementation
- Modified: `apps/central/src/_api/http/index.ts:144` - Integrated health plugin registration
- Modified: `apps/central/src/_api/routes/meta/routes.ts:24-72` - Added `/meta/health` endpoint
- Modified: `apps/central/src/_api/routes/meta/schemas.ts:12-37` - Added health response schemas
- Modified: `apps/central/src/_config/types.ts:36-43,66` - Added HealthConfig type definition
- Modified: `apps/central/package.json` - Added @fastify/under-pressure v9.0.3 dependency

## Relations
- implements [[Health Monitoring System]]
- uses [[Fastify Plugin System]]
- integrates_with [[Dependency Injection Container]]
- monitors [[Database Connections]]
- monitors [[Redis Connection]]  
- monitors [[Temporal Client]]
- follows [[Project Schema Patterns]]
- part_of [[Central API Application]]