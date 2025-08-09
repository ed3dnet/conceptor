# Task Master AI - Agent Integration Guide

## Essential Commands

### Core Workflow Commands

```bash
# Project Setup
task-master init                                    # Initialize Task Master in current project
task-master parse-prd .taskmaster/docs/prd.txt      # Generate tasks from PRD document
task-master models --setup                        # Configure AI models interactively

# Daily Development Workflow
task-master list                                   # Show all tasks with status
task-master next                                   # Get next available task to work on
task-master show <id>                             # View detailed task information (e.g., task-master show 1.2)
task-master set-status --id=<id> --status=done    # Mark task complete

# Task Management
task-master add-task --prompt="description" --research        # Add new task with AI assistance
task-master expand --id=<id> --research --force              # Break task into subtasks
task-master update-task --id=<id> --prompt="changes"         # Update specific task
task-master update --from=<id> --prompt="changes"            # Update multiple tasks from ID onwards
task-master update-subtask --id=<id> --prompt="notes"        # Add implementation notes to subtask

# Analysis & Planning
task-master analyze-complexity --research          # Analyze task complexity
task-master complexity-report                      # View complexity analysis
task-master expand --all --research               # Expand all eligible tasks

# Dependencies & Organization
task-master add-dependency --id=<id> --depends-on=<id>       # Add task dependency
task-master move --from=<id> --to=<id>                       # Reorganize task hierarchy
task-master validate-dependencies                            # Check for dependency issues
task-master generate                                         # Update task markdown files (usually auto-called)
```

## Key Files & Project Structure

### Core Files

- `.taskmaster/tasks/tasks.json` - Main task data file (auto-managed)
- `.taskmaster/config.json` - AI model configuration (use `task-master models` to modify)
- `.taskmaster/docs/prd.txt` - Product Requirements Document for parsing
- `.taskmaster/tasks/*.txt` - Individual task files (auto-generated from tasks.json)
- `.env` - API keys for CLI usage

### Claude Code Integration Files

- `CLAUDE.md` - Auto-loaded context for Claude Code (this file)
- `.claude/settings.json` - Claude Code tool allowlist and preferences
- `.claude/commands/` - Custom slash commands for repeated workflows
- `.mcp.json` - MCP server configuration (project-specific)

### Directory Structure

```
project/
├── .taskmaster/
│   ├── tasks/              # Task files directory
│   │   ├── tasks.json      # Main task database
│   │   ├── task-1.md      # Individual task files
│   │   └── task-2.md
│   ├── docs/              # Documentation directory
│   │   ├── prd.txt        # Product requirements
│   ├── reports/           # Analysis reports directory
│   │   └── task-complexity-report.json
│   ├── templates/         # Template files
│   │   └── example_prd.txt  # Example PRD template
│   └── config.json        # AI models & settings
├── .claude/
│   ├── settings.json      # Claude Code configuration
│   └── commands/         # Custom slash commands
├── .env                  # API keys
├── .mcp.json            # MCP configuration
└── CLAUDE.md            # This file - auto-loaded by Claude Code
```

### MCP Tools (Preferred Method)

Use these MCP tools instead of CLI commands when working with Claude Code:

```javascript
// Project setup
mcp__task-master-ai__initialize_project  // = task-master init
mcp__task-master-ai__parse_prd          // = task-master parse-prd

// Daily workflow - USE THESE INSTEAD OF CLI
mcp__task-master-ai__get_tasks          // = task-master list
mcp__task-master-ai__next_task          // = task-master next  
mcp__task-master-ai__get_task           // = task-master show <id>
mcp__task-master-ai__set_task_status    // = task-master set-status

// Task management
mcp__task-master-ai__add_task           // = task-master add-task
mcp__task-master-ai__expand_task        // = task-master expand
mcp__task-master-ai__update_task        // = task-master update-task
mcp__task-master-ai__update_subtask     // = task-master update-subtask

// Analysis
mcp__task-master-ai__analyze_project_complexity  // = task-master analyze-complexity
mcp__task-master-ai__complexity_report           // = task-master complexity-report
```

**Note**: Always use MCP tools when available in Claude Code. Fall back to CLI only if MCP tools are unavailable.

## Claude Code Workflow Integration

### Standard Development Workflow

#### 1. Project Initialization

```bash
# Initialize Task Master
task-master init

# Create or obtain PRD, then parse it
task-master parse-prd .taskmaster/docs/prd.txt

# Analyze complexity and expand tasks
task-master analyze-complexity --research
task-master expand --all --research
```

If tasks already exist, another PRD can be parsed (with new information only!) using parse-prd with --append flag. This will add the generated tasks to the existing list of tasks..

#### 2. Daily Development Loop - Task Batching Approach

```bash
# Start each session - Task Batching Approach
task-master list                           # Review all tasks and dependencies
# Identify tightly coupled task sequences (implementation chains, feature completeness)
# Create feature branch using git-mcp for the batch (e.g., feature/auth-implementation)

# For task batches, work as cohesive units:
task-master show <batch-start-id>         # Review batch starting point
task-master show <batch-end-id>           # Review batch completion point

# Work through complete sequence as one implementation unit
# Use memory-searcher-v1 for context discovery at batch start
# Update subtasks throughout the batch implementation
task-master update-subtask --id=<id> --prompt="batch progress notes..."

# Complete entire batch before moving to next logical boundary
# Use code-reviewer-v1 for entire batch review
```

### Custom Slash Commands

Create `.claude/commands/taskmaster-next.md`:

```markdown
Find the next available Task Master task and show its details.

Steps:

1. Run `task-master next` to get the next task
2. If a task is available, run `task-master show <id>` for full details
3. Provide a summary of what needs to be implemented
4. Suggest the first implementation step
```

Create `.claude/commands/taskmaster-complete.md`:

```markdown
Complete a Task Master task: $ARGUMENTS

Steps:

1. Review the current task with `task-master show $ARGUMENTS`
2. Verify all implementation is complete
3. Run any tests related to this task
4. Mark as complete: `task-master set-status --id=$ARGUMENTS --status=done`
5. Show the next available task with `task-master next`
```

## Tool Allowlist Recommendations

Add to `.claude/settings.json`:

```json
{
  "allowedTools": [
    "Edit",
    "Bash(task-master *)",
    "Bash(git commit:*)",
    "Bash(git add:*)",
    "Bash(npm run *)",
    "mcp__task_master_ai__*"
  ]
}
```

## Task Structure & IDs

### Task ID Format

- Main tasks: `1`, `2`, `3`, etc.
- Subtasks: `1.1`, `1.2`, `2.1`, etc.
- Sub-subtasks: `1.1.1`, `1.1.2`, etc.

### Task Status Values

- `pending` - Ready to work on
- `in-progress` - Currently being worked on
- `done` - Completed and verified
- `deferred` - Postponed
- `cancelled` - No longer needed
- `blocked` - Waiting on external factors

### Task Fields

```json
{
  "id": "1.2",
  "title": "Implement user authentication",
  "description": "Set up JWT-based auth system",
  "status": "pending",
  "priority": "high",
  "dependencies": ["1.1"],
  "details": "Use bcrypt for hashing, JWT for tokens...",
  "testStrategy": "Unit tests for auth functions, integration tests for login flow",
  "subtasks": []
}
```

## Claude Code Best Practices with Task Master

### Task Batching Strategy

**Identify Task Batches by:**
- **Implementation chains**: Tasks with direct dependencies (Task A → Task B → Task C)
- **Feature completeness**: Groups of tasks that together deliver a complete, testable feature  
- **Logical boundaries**: Natural stopping points where a feature is functional and can be committed

**Batch Workflow:**
1. **Create feature branch** using git-mcp for the batch (e.g., `feature/health-check-implementation`)
2. **Use `memory-searcher-v1`** at batch start for complete context discovery
3. **Work through complete sequence** as one implementation unit
4. **Use `code-reviewer-v1`** to review entire batch as cohesive feature
5. **Commit and merge** only after complete logical unit is done using git-mcp

**Example**: Instead of stopping after "install package", continue through "create infrastructure" → "implement core functionality" → "configure routes" → "register plugin" as single work unit.

### Context Management

- Use `/clear` between different tasks to maintain focus
- This CLAUDE.md file is automatically loaded for context
- Use `task-master show <id>` to pull specific task context when needed

### Batch Implementation Workflow

1. **Identify Task Batch**: Look for implementation chains (A→B→C) or feature completeness groups
2. **Create Feature Branch**: Use git-mcp to create branch (e.g., `feature/batch-name`)
3. **Context Discovery**: Use `memory-searcher-v1` for entire feature area context
4. **Batch Planning**: 
   - `task-master show <start-id>` through `task-master show <end-id>`
   - Plan the complete sequence as one unit
5. **Batch Implementation**:
   - Set all batch tasks to in-progress: `task-master set-status --id=<id> --status=in-progress`
   - Work through the complete implementation chain
   - Log progress across the batch: `task-master update-subtask --id=<id> --prompt="batch progress"`
6. **Batch Completion**:
   - Complete all tasks in the batch together
   - Use `code-reviewer-v1` for entire feature review
   - Commit entire batch as cohesive unit using git-mcp
   - Stop only at logical completion boundaries

### Complex Workflows with Checklists

For large migrations or multi-step processes:

1. Create a markdown PRD file describing the new changes: `touch task-migration-checklist.md` (prds can be .txt or .md)
2. Use Taskmaster to parse the new prd with `task-master parse-prd --append` (also available in MCP)
3. Use Taskmaster to expand the newly generated tasks into subtasks. Consdier using `analyze-complexity` with the correct --to and --from IDs (the new ids) to identify the ideal subtask amounts for each task. Then expand them.
4. Work through items systematically, checking them off as completed
5. Use `task-master update-subtask` to log progress on each task/subtask and/or updating/researching them before/during implementation if getting stuck

### Git Integration

Follow other instructions for using Git, including waiting for human operator confirmation.

- Use the git MCP server you already know about.
- Reference tasks in the first line of commit messages, e.g. `feat: implement JWT auth (task 1.2)`

## Troubleshooting

### AI Commands Failing

```bash
# Check API keys are configured
cat .env                           # For CLI usage

# Verify model configuration
task-master models

# Test with different model
task-master models --set-fallback gpt-4o-mini
```

### MCP Connection Issues

- Check `.mcp.json` configuration
- Verify Node.js installation
- Use `--mcp-debug` flag when starting Claude Code
- Use CLI as fallback if MCP unavailable

### Task File Sync Issues

```bash
# Regenerate task files from tasks.json
task-master generate

# Fix dependency issues
task-master fix-dependencies
```

DO NOT RE-INITIALIZE. That will not do anything beyond re-adding the same Taskmaster core files.

## Important Notes

### AI-Powered Operations

These commands make AI calls and may take up to a minute:

- `parse_prd` / `task-master parse-prd`
- `analyze_project_complexity` / `task-master analyze-complexity`
- `expand_task` / `task-master expand`
- `expand_all` / `task-master expand --all`
- `add_task` / `task-master add-task`
- `update` / `task-master update`
- `update_task` / `task-master update-task`
- `update_subtask` / `task-master update-subtask`

### File Management

- Never manually edit `tasks.json` - use commands instead
- Never manually edit `.taskmaster/config.json` - use `task-master models`
- Task markdown files in `tasks/` are auto-generated
- Run `task-master generate` after manual changes to tasks.json

### Claude Code Session Management

- Use `/clear` frequently to maintain focused context
- Create custom slash commands for repeated Task Master workflows
- Configure tool allowlist to streamline permissions
- Use headless mode for automation: `claude -p "task-master next"`

### Multi-Task Updates

- Use `update --from=<id>` to update multiple future tasks
- Use `update-task --id=<id>` for single task updates
- Use `update-subtask --id=<id>` for implementation logging

### Research Mode

- Add `--research` flag for research-based AI enhancement
- Requires a research model API key like Perplexity (`PERPLEXITY_API_KEY`) in environment
- Provides more informed task creation and updates
- Recommended for complex technical tasks

---

_This guide ensures Claude Code has immediate access to Task Master's essential functionality for agentic development workflows._
