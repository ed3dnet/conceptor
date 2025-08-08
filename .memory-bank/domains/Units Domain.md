---
title: Units Domain
type: note
permalink: domains/units-domain
tags:
- '["units"'
- '"organizational-structure"'
- '"assignments"'
- '"hierarchy"'
- '"workforce"'
- '"temporal-data"]'
---

# Units Domain

## Purpose
Manages organizational structure through hierarchical units and user assignments for workforce organization.

## Bounded Context
- **Core Responsibility**: Organizational hierarchy, user assignments, unit lifecycle
- **Entity**: Unit (individual/organizational) with assignments
- **Rich ID**: `unit-{ULID}` format

## Key Concepts

### Unit Types
- **Individual Units**: Represent single positions, can have user assignments
- **Organizational Units**: Represent departments/teams, cannot have direct assignments
- Hierarchical structure with parent-child relationships

### Unit Assignments
- Time-bounded user assignments to individual units
- Start/end date tracking for historical records
- Only individual units can have user assignments
- Multiple users can be assigned to same unit over time

### Organizational Hierarchy
- Parent-child relationships form organizational tree
- Circular reference prevention in parent assignments
- Cascade validation for deletions (no orphaned children)

## Service Operations

### Unit Management
- `createUnit()`: Creates individual or organizational units
- `updateUnit()`: Updates unit properties with change tracking
- `deleteUnit()`: Removes units after validation (no children/assignments)
- Parent-child relationship validation and circular reference prevention

### Assignment Operations
- `assignUserToUnit()`: Creates time-bounded user assignments
- `unassignUserFromUnit()`: Sets end date on active assignments
- Individual unit type enforcement for assignments
- Conflict detection for duplicate active assignments

### Hierarchy Navigation
- `getChildUnits()`: Retrieves immediate child units
- `getUnitAssignments()`: Gets active/historical assignments
- Hierarchical relationship queries and validation

### Data Transformation
- `toPublic()`: Basic unit information
- `toPublicWithAssignments()`: Unit with current assignment details
- Rich ID conversion for external APIs

### Tagging System
- `setUnitTag()`: Key-value metadata for units
- `getUnitTags()`: Retrieve all unit tags
- Flexible metadata system for custom attributes

## Interactions

### With Users Domain
- Validates user existence before assignment creation
- User assignments create historical employment records
- Assignment events for user lifecycle tracking

### With Tenants Domain
- All units scoped within tenant boundaries
- Tenant context required for all operations

### With Events Domain
- Unit lifecycle events: Created, Updated, Deleted
- Assignment events: UserAssignedToUnit, UserUnassignedFromUnit
- Event-driven workflow automation

## Storage
- `UNITS`: Main unit table with hierarchy references
- `UNIT_ASSIGNMENTS`: Time-bounded user assignments
- `UNIT_TAGS`: Flexible key-value metadata
- Rich ID pattern for external representation

## Business Rules
- Only individual units can have user assignments
- Units with active assignments cannot be deleted
- Units with child units cannot be deleted
- Assignment end dates must be after start dates
- Parent units cannot create circular references

## Event Integration
- All operations emit domain events for workflow automation
- Event squelching option for bulk operations
- Structured event payloads with rich IDs

## Observations
- [concept] Units domain manages organizational hierarchy through typed units (individual/organizational) with time-bounded user assignments #organizational-structure #hierarchy #workforce-management
- [technique] Unit type enforcement ensures only individual units receive user assignments while organizational units provide structure #unit-types #business-rules #type-safety
- [pattern] Time-bounded assignments with start/end dates create historical employment records #temporal-assignments #employment-history
- [detail] Hierarchical validation prevents circular references and enforces cascade deletion rules #hierarchy-validation #data-integrity

## Relations
- part_of [[Central Project Architecture]]
- collaborates_with [[Users Domain]]
- scoped_by [[Tenants Domain]]
- publishes_to [[Events Domain]]
- enables [[Organizational Hierarchy]]
- implements [[Workforce Management]]
- uses [[Rich IDs Usage Guide]]