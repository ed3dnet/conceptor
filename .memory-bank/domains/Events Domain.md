---
title: Events Domain
type: note
permalink: domains/events-domain
tags:
- '["events"'
- '"type-safety"'
- '"temporal"'
- '"inter-domain"'
- '"validation"'
- '"dispatch"'
- '"workflows"]'
---

# Events Domain

## Purpose
Provides type-safe event dispatch system for cross-domain communication and workflow automation.

## Bounded Context
- **Core Responsibility**: Event validation, dispatch coordination, listener management
- **No Rich ID**: Infrastructure service for inter-domain messaging
- **Focus**: Event flow orchestration, not event storage

## Key Concepts

### Event Registry System
- Compile-time type checking with TypeBox schemas
- Discriminated union types for event validation
- Static event-to-schema mapping for runtime safety

### Event Dispatch Architecture
- Schema validation before dispatch
- Parallel listener execution via Temporal workflows
- Error isolation per listener (failures don't block others)

### Listener Registration
- Static registration in `EVENT_LISTENERS` configuration
- Named handlers for debugging and monitoring
- Type-safe handler signatures per event type

## Service Operations

### Core Dispatch
- `dispatchEvent()`: Validates and routes events to registered listeners
- Schema validation using compiled TypeBox checkers
- Parallel dispatch to all registered listeners for event type

### Validation Pipeline
- Runtime schema validation against registered event types
- Error logging with detailed validation failures
- Unknown event type rejection for system integrity

### Temporal Integration
- All listeners executed as Temporal workflows
- Automatic retry and failure handling via Temporal
- Distributed execution across worker processes

## Architecture Components

### Event Registry (`event-registry.ts`)
- Compile-time generation of event type mappings
- TypeBox schema compilation for runtime validation
- Type-safe handler signature enforcement

### Event Listeners (`event-listeners.ts`)
- Static configuration of event-to-handler mappings
- Named handlers for operational observability
- Multiple listeners per event type support

### Event List (`event-list.ts`)
- Centralized registry of all system events
- Imported from all domain event schema definitions
- Union type generation for compile-time safety

## Interactions

### With All Domains
- **Users Domain**: UserCreated, UserUpdated, email events
- **Units Domain**: UnitCreated, UserAssigned, etc.
- **Other Domains**: Extensible event publication system

### With Temporal
- All event handlers executed as Temporal workflows
- Automatic retry, timeout, and failure handling
- Distributed execution and observability

### With Logging System
- Structured logging with event types and listener names
- Error reporting for failed validations and handlers
- Debug-level tracing for event flow

## Event Flow
1. Domain service calls `events.dispatchEvent(event)`
2. Event type extracted and validated against registry
3. Schema validation using compiled TypeBox checker
4. Listeners retrieved for event type
5. Parallel dispatch to all listeners via Temporal
6. Individual listener failures logged but don't block others

## Type Safety Features
- Compile-time event type validation
- Handler signature matching per event type
- Discriminated union prevents event type confusion
- Static analysis of event-handler relationships

## Observations
- [concept] Events domain provides type-safe inter-domain communication with compile-time validation and runtime safety #events #type-safety #inter-domain-communication
- [technique] TypeBox schema compilation enables runtime validation with compile-time type safety #typebox #schema-validation #runtime-safety
- [pattern] Parallel listener execution via Temporal workflows provides resilience and scalability #temporal #parallel-execution #resilience
- [detail] Static event registry prevents unknown event types and ensures handler signature compatibility #static-typing #event-registry

## Relations
- part_of [[Central Project Architecture]]
- enables [[Inter-Domain Communication]]
- collaborates_with [[Users Domain]]
- collaborates_with [[Units Domain]]
- collaborates_with [[Tenants Domain]]  
- integrates_with [[Temporal Workflows]]
- provides [[Event-Driven Architecture]]