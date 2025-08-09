# Development Workflow with Task Master + Claude Code

This document describes how to use Task Master with Claude Code for systematic feature development in this project.

## Overview

Our development workflow uses:
- **Task Master**: AI-powered task planning and management
- **Claude Code**: Implementation and code review
- **Basic Memory**: Knowledge accumulation and decision tracking
- **Git**: Version control with PR-based code review

## Initial Setup (Once per Project)

### 1. Initialize Task Master
```bash
task-master init
```

### 2. Configure AI Models
```bash
task-master models --setup
```
Choose models for:
- **Main**: Primary task generation (recommended: Claude)
- **Research**: Enhanced context (recommended: Perplexity)
- **Fallback**: Backup when primary fails

### 3. Set Environment Variables
Ensure API keys are configured in `.env`:
```bash
ANTHROPIC_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here  # For research features
```

## Feature Development Workflow

### Step 1: Write a Product Requirements Document (PRD)

Create a comprehensive PRD describing what you want to build:

```bash
# Create your PRD
vim .taskmaster/docs/prd.txt
```

Example PRD content:
```
# Health and Liveness Checks

## Overview
Add comprehensive health and liveness check endpoints to our Fastify application to support Kubernetes deployment and monitoring.

## Requirements
- Health check endpoint at /health that validates database connectivity
- Liveness probe at /live for Kubernetes
- Graceful shutdown handling
- Prometheus metrics integration
- Documentation and tests

## Acceptance Criteria
- Endpoints return appropriate HTTP status codes
- Database connection is validated in health checks
- Metrics are exported for monitoring
- Tests cover happy path and failure scenarios
```

### Step 2: Generate Tasks from PRD

```bash
# Parse PRD into hierarchical tasks
task-master parse-prd .taskmaster/docs/prd.txt

# Analyze complexity and identify expansion opportunities
task-master analyze-complexity --research

# Expand all tasks into detailed subtasks
task-master expand --all --research
```

This creates a structured task hierarchy in `.taskmaster/tasks/tasks.json`.

### Step 3: Development Loop with Claude Code

Start Claude Code and begin implementing:

```bash
cd /path/to/project
claude
```

#### Daily Development Commands

**Get next task:**
```bash
task-master next                    # Find next available task
task-master show <id>              # View detailed task info
```

**Start working on a task:**
```bash
task-master set-status --id=<id> --status=in-progress
```

**Update task with implementation notes:**
```bash
task-master update-subtask --id=<id.1> --prompt="Implemented Fastify health endpoint with database ping"
```

**Complete tasks:**
```bash
task-master set-status --id=<id.1> --status=done
```

#### Example Development Session

```bash
# Get next task
task-master next
# Output: Task 1.1: Implement health check endpoint

# View details
task-master show 1.1
# Shows: Create /health endpoint that checks database connectivity

# Start work
task-master set-status --id=1.1 --status=in-progress

# [Implement the code...]

# Document progress
task-master update-subtask --id=1.1 --prompt="Added /health route using Fastify with pg pool.query() test"

# Mark complete
task-master set-status --id=1.1 --status=done
```

### Step 4: Automated Code Review

When you complete implementation, Claude Code will automatically:

1. **Evaluate for Basic Memory**: Identify new techniques, decisions, or concepts to document
2. **Stage Git Changes**: Prepare files for commit
3. **Run Code Review**: Invoke the `code-reviewer-v1` sub-agent
4. **Present Recommendations**: Show code quality feedback and knowledge management suggestions
5. **Propose Commit**: Generate a conventional commit message for approval

### Step 5: Pull Request Workflow

After committing changes:

1. **Create feature branch** (if not already on one)
2. **Push changes** to remote
3. **Create pull request** using GitHub CLI or web interface
4. **Code reviewer agent** can examine PR diffs and provide additional feedback
5. **Merge with squash** to maintain clean history while preserving review discussion

## Task Management Commands

### Viewing Tasks
```bash
task-master list                    # Show all tasks
task-master list --status=pending  # Filter by status
task-master show <id>              # Detailed task view
task-master complexity-report      # View complexity analysis
```

### Modifying Tasks
```bash
task-master add-task --prompt="Add Redis caching" --research
task-master expand --id=<id> --research
task-master update-task --id=<id> --prompt="Changed approach to use connection pooling"
task-master move --from=<id> --to=<id>  # Reorganize hierarchy
```

### Dependencies
```bash
task-master add-dependency --id=<id> --depends-on=<other-id>
task-master validate-dependencies   # Check for circular refs
task-master fix-dependencies        # Auto-fix issues
```

## Multi-Session Development

Task Master supports multiple concurrent Claude Code sessions:

- Each session can work on different tasks
- Task Master prevents duplicate assignments
- Progress is synchronized across sessions
- Use `task-master next` to get optimal task assignment

## Troubleshooting

### Task Master Issues
```bash
# Check API configuration
task-master models

# Validate task file integrity
task-master validate-dependencies

# Regenerate task files
task-master generate
```

### Claude Code Integration
- Ensure `.mcp.json` contains Task Master server configuration
- Check API keys in environment variables
- Use CLI fallback if MCP unavailable: `task-master <command>`

## Best Practices

1. **Write Comprehensive PRDs**: Better input = better task breakdown
2. **Use Research Mode**: Add `--research` flag for complex technical tasks
3. **Update Tasks Regularly**: Document implementation decisions and blockers
4. **Follow Git Workflow**: Create feature branches, use PRs for review
5. **Trust the Process**: Let Task Master guide the implementation order
6. **Document Decisions**: Capture architectural choices in Basic Memory

## File Structure

```
.taskmaster/
├── tasks/
│   ├── tasks.json          # Main task database
│   └── task-*.md           # Individual task files
├── docs/
│   ├── prd.txt            # Your PRD documents
│   └── requirements.md    # Additional specs
├── reports/
│   └── task-complexity-report.json
└── config.json            # AI model configuration
```

## Integration with Existing Tools

- **Testing**: Run tests before marking tasks complete
- **Linting**: Automated via pre-commit hooks
- **CI/CD**: Task completion triggers automated builds
- **Monitoring**: Track task completion metrics
- **Documentation**: Auto-generate docs from completed tasks

This workflow ensures systematic, reviewable, and well-documented feature development while maintaining code quality and knowledge continuity.