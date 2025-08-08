---
title: Tiltfile and Dev Environment Architecture
type: note
permalink: specs/tiltfile-and-dev-environment-architecture
tags:
- dev-env
- tilt
- kubernetes
- microservices
- tooling
- temporal
- worker
- auth
- storage
- build
- routing
- config
---

# Tiltfile and Dev Environment Architecture

## Executive Summary

This project uses Tilt as the primary orchestration tool for local development, managing a microservices architecture with multiple backend services, databases, and supporting infrastructure. The `_dev-env/` directory contains all Kubernetes manifests, scripts, and configuration needed to run the complete development stack locally. This setup follows modern 2024 best practices for Tilt-based Kubernetes development.

## Architecture Overview

### Core Philosophy
- **Environment-as-Code**: The entire development environment is defined declaratively
- **Microservices Architecture**: Separate services for API, workers, UI, and supporting infrastructure
- **Kubernetes-Native**: Uses Kustomize for configuration management and proper K8s resource organization
- **Dependency Management**: Explicit dependency chains ensure services start in correct order

### Technology Stack
- **Orchestration**: Tilt for dev environment management
- **Container Platform**: Kubernetes (supports OrbStack, Rancher Desktop)
- **Configuration Management**: Kustomize for environment-specific overlays
- **Service Mesh**: Caddy-based front-door for routing
- **Infrastructure**: PostgreSQL, Redis, MinIO (S3), Temporal (workflow engine), Keycloak (auth), Mailpit (email testing)

## Key Components Breakdown

### Tiltfile Structure (`Tiltfile:1-178`)

#### Environment Configuration (lines 1-7)
```python
tilt_runmode = os.environ['TILT_RUNMODE']        # Controls dev vs production behavior
tilt_port_prefix = os.environ['TILT_PORT_PREFIX'] # Port assignment strategy
tilt_namespace = os.environ['TILT_NAMESPACE']     # K8s namespace isolation
```

#### Security Controls (lines 6-7)
```python
allow_k8s_contexts("orbstack")      # Whitelist safe local clusters
allow_k8s_contexts("rancher-desktop")
```

#### Core Infrastructure (lines 14-37)
- **Custom Temporal Docker Build**: Uses `_dev-env/k8s/temporal/Dockerfile` for workflow engine
- **Kustomize Integration**: Applies base manifests via `kustomize('./_dev-env')`
- **Port Forwarding**: Exposes all services with environment-driven port mapping

#### Dependency Orchestration (lines 42-81)
Five critical wait scripts ensure proper startup order:
1. `wait-for-postgres.bash` - Database connectivity
2. `wait-for-temporal.bash` - Workflow engine readiness
3. `wait-for-redis.bash` - Cache availability
4. `wait-for-keycloak.bash` - Auth service startup
5. `ensure-minio.bash` - S3 buckets creation and configuration

#### Application Services (lines 83-177)
When `TILT_RUNMODE == 'dev-in-tilt'`:
- **API Server**: FastAPI-based backend with OpenAPI docs
- **Workers**: Configurable count of core and media workers using Temporal
- **Database Tools**: Drizzle Studio for database management
- **Frontend**: Panel UI with hot reloading
- **Testing**: Unit test execution integrated into development loop

### _dev-env/ Directory Structure

#### Kubernetes Manifests (`_dev-env/k8s/`)
```
k8s/
├── front-door/     # Caddy reverse proxy (conceptor.lvh.me routing)
├── postgres/       # Main database with persistence
├── redis/          # Cache layer
├── temporal/       # Workflow engine (custom build)
├── keycloak/       # Identity provider with realm import
├── minio/          # S3-compatible storage
└── mailpit/        # Email testing service
```

Each service follows Kustomize patterns:
- `kustomization.yaml` - Resource aggregation
- `deployment.yaml` - Pod specifications
- `service.yaml` - Network exposure
- `configmap.yaml` - Configuration injection

#### Scripts Directory (`_dev-env/scripts/`)
- **Setup**: `dev-setup.bash` - Complete environment bootstrapping
- **Waiting**: `wait-for-*.bash` - Service readiness checks
- **Database**: `reset-postgres.bash` - Clean database reset
- **Storage**: `ensure-minio.bash` - S3 bucket management
- **Platform-Specific**: `macos/` and `ubuntu/` installation helpers

## Development Workflow Patterns

### Standard Development Flow

1. **Environment Setup** (One-time):
   ```bash
   ./_dev-env/scripts/dev-setup.bash  # Bootstrap tooling
   tilt up                            # Start development stack
   ```

2. **Daily Development**:
   - Tilt dashboard shows all service status at `http://localhost:10350`
   - Code changes trigger automatic rebuilds via Tilt's file watching
   - Database migrations run automatically via `migrate-postgres` resource
   - Live reloading for both API and frontend components

3. **Service Dependencies**:
   ```
   wait-for-dependencies (meta resource)
   ├── wait-for-postgres
   ├── wait-for-temporal  
   ├── wait-for-redis
   ├── wait-for-keycloak
   └── ensure-minio
   ```

### Port Management Strategy

All ports use environment-driven assignment:
- **FRONTDOOR_PORT**: Main application entry (typically :44000)
- **API Base**: Backend API (typically :44001)  
- **Panel**: Frontend UI (typically :44002)
- **Database Tools**: Drizzle Studio (port_prefix + '21')
- **Infrastructure**: Each service gets dedicated ports via environment variables

### Resource Organization (Tilt Labels)

- `["00-app"]` - Primary application services (API, Panel)
- `["01-worker"]` - Background job processors
- `["02-test"]` - Testing resources
- `["03-cmd"]` - One-time command resources
- `["04-util"]` - Development utilities
- `["98-svc"]` - Infrastructure services
- `["99-meta"]` - Orchestration resources

## Service-Specific Details

### Database Layer
- **PostgreSQL 16**: Main transactional database
- **Persistent Storage**: Uses PVC for data retention across restarts
- **Migration Strategy**: Automatic via Drizzle ORM
- **Development Tools**: Drizzle Studio for schema management

### Worker Architecture  
- **Temporal Integration**: Distributed workflow engine
- **Scalable Workers**: Configurable core/media worker counts
- **Queue Management**: Separate worker types for different job categories

### Authentication & Authorization
- **Keycloak**: Enterprise identity provider
- **Realm Import**: Pre-configured with `technova.json` realm
- **Development Mode**: Admin/admin default credentials

### Storage System
- **MinIO**: S3-compatible object storage
- **Bucket Management**: Auto-creation of required buckets
- **Public Access**: Configurable per-bucket permissions

### Frontend Routing
- **Caddy Reverse Proxy**: Modern HTTP server with automatic HTTPS
- **Domain Strategy**: Uses `conceptor.lvh.me` for local development
- **API Routing**: `/api/*` routes to backend, everything else to frontend

## Common Operational Tasks

### Database Management
```bash
# Reset database completely
tilt trigger reset-postgres

# View database in browser
# Navigate to link shown in API resource (Drizzle Studio)

# Manual migration
cd apps/central && pnpm cli:dev db migrate
```

### Service Debugging
```bash
# View logs for specific service
tilt logs api
tilt logs worker-core-0

# Restart specific service  
tilt restart localdev-postgres

# Force rebuild
tilt trigger api
```

### Environment Troubleshooting
```bash
# Check service connectivity
bash _dev-env/scripts/wait-for-postgres.bash
bash _dev-env/scripts/wait-for-temporal.bash

# Verify MinIO bucket setup
bash _dev-env/scripts/ensure-minio.bash

# Clean restart everything
tilt down && tilt up
```

## Configuration Management Patterns

### Environment Variables Strategy
- **Prefix-based**: `CENTRAL_*` for backend config, `TILT_*` for dev environment
- **URL Construction**: Dynamic based on ports and hosts
- **Security**: Sensitive values in `.env.development` (not committed)

### Kustomize Organization
```yaml
# Base configuration in _dev-env/kustomization.yaml
resources:
  - k8s/front-door
  - k8s/redis  
  - k8s/mailpit
  - k8s/temporal
  - k8s/minio
  - k8s/postgres
  - k8s/keycloak
```

### Docker Build Strategy
- **Custom Images**: Only for services requiring customization (Temporal)
- **Official Images**: Used for standard infrastructure (Postgres, Redis, etc.)
- **Build Context**: Minimal to optimize build speed

## Best Practices Observed

### Security
- **Context Whitelisting**: Only allow safe local K8s clusters
- **Credential Management**: Default dev credentials, production separation
- **Network Isolation**: Kubernetes namespace isolation

### Performance  
- **Parallel Resource Startup**: `allow_parallel=True` where safe
- **Dependency Optimization**: Minimal dependency chains
- **Resource Labeling**: Logical grouping for dashboard organization

### Developer Experience
- **One-Command Setup**: Complete environment via `tilt up`
- **Real-time Feedback**: Web dashboard with logs and status
- **Hot Reloading**: File watching with automatic updates
- **Integrated Tools**: Database studio, API docs, email testing

### Maintenance
- **Health Checks**: Readiness probes for all services
- **Graceful Degradation**: Services can restart independently
- **Clean Reset**: Easy database/service reset capabilities

## Architecture Decisions & Rationale

### Why Tilt Over Alternatives?
- **Kubernetes-Native**: Better than docker-compose for production parity
- **Developer Experience**: Superior to raw kubectl/helm for development
- **Live Updates**: Faster feedback loop than traditional build-deploy cycles

### Why Kustomize Over Helm?
- **Simplicity**: No templating language complexity
- **Kubernetes Native**: Integrated into kubectl
- **Environment Overlays**: Clean separation of environment-specific config

### Why Custom Temporal Build?
- **Version Control**: Specific version pinning for consistency
- **Configuration**: Custom environment variables and setup
- **Development Mode**: Optimized for local development usage

## Future Model Orientation Guidelines

### When Investigating Issues:
1. **Check Tilt Dashboard**: Primary source of truth for service status
2. **Review Environment Variables**: Most configuration is environment-driven
3. **Follow Dependency Chain**: Services have explicit startup dependencies
4. **Check Scripts**: Most operational tasks have corresponding scripts

### When Making Changes:
1. **Understand Resource Labels**: Changes should respect logical grouping
2. **Consider Dependencies**: New services need proper dependency declarations  
3. **Follow Naming Conventions**: `localdev-*` prefix for all local resources
4. **Test Startup Order**: Ensure new services integrate properly with wait scripts

### When Debugging:
1. **Start with Infrastructure**: Database, Redis, Temporal are foundational
2. **Check Port Conflicts**: All ports are environment-configurable
3. **Verify Kustomize**: Manifest changes require proper Kustomize structure
4. **Use Tilt Triggers**: Most issues can be resolved with targeted restarts

## Observations

- [detail] Tilt orchestrates the complete development environment using Kubernetes-native resources #dev-env #tilt
- [technique] Dependency management uses explicit wait scripts to ensure proper service startup order #dev-env #tooling
- [technique] Port forwarding strategy uses environment variables for flexible port assignment #dev-env #config
- [technique] Kustomize provides template-free configuration management for Kubernetes manifests #dev-env #tooling
- [technique] Custom Temporal Docker build allows version pinning and development-specific configuration #worker #temporal #build
- [technique] Resource labeling system organizes services into logical groups for dashboard management #dev-env #tilt
- [technique] Caddy reverse proxy handles routing between API and frontend with lvh.me domain #dev-env #routing
- [detail] Worker architecture uses Temporal for distributed job processing with configurable scaling #worker #temporal
- [detail] Storage system uses MinIO for S3-compatible object storage with automatic bucket management #dev-env #storage
- [detail] Authentication handled by Keycloak with pre-configured realm import for development #auth #keycloak
- [technique] Health check scripts validate service readiness before allowing dependent services to start #dev-env #tooling
- [decision] Chose Tilt over docker-compose for better Kubernetes production parity in development #dev-env #tilt

## Relations

- implements [[Microservices Architecture]]
- requires [[Kubernetes Local Development]]
- uses [[Temporal Workflow Engine]]
- integrates_with [[PostgreSQL Database]]
- integrates_with [[Redis Cache]]
- integrates_with [[MinIO Object Storage]]
- integrates_with [[Keycloak Authentication]]
- part_of [[Development Environment]]
- enables [[Hot Reloading Development]]
- supports [[Worker Job Processing]]