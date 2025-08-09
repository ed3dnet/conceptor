# Claude Code Instructions
**All imports in this document should be treated as if they were in the main CLAUDE.md file.**

## MCP Orientation Instructions
@./.taskmaster/CLAUDE.md
@.claude/mcp-descriptions/basic-memory.mdc
@.claude/mcp-descriptions/git-mcp.mdc
@.claude/mcp-descriptions/brave-search.mdc
@.claude/mcp-descriptions/tavily-search.mdc
@.claude/mcp-descriptions/github-mcp.mdc

NEVER USE A COMMAND-LINE TOOL WHEN AN MCP TOOL IS AVAILABLE. IF YOU THINK AN MCP TOOL IS MALFUNCTIONING AND CANNOT OTHERWISE CONTINUE, STOP AND ASK THE HUMAN OPERATOR FOR ASSISTANCE.

## Extra References
Some references are used both by you and your sub-agents, to provide agreed-upon modes of working.

@.claude/custom-instructions/knowledge-management.mdc

## Knowledge Management and Task Management

Task Master likes to create several tasks for a single problem. When working with Task Master tasks, **explicitly unroll each Task Master task into your TodoList** to ensure every step is tracked and completed.

**Task Batching**: ALWAYS TRY TO WORK IN BATCHES. Always attempt to work on tightly coupled task sequences as cohesive units rather than stopping after each individual task. Look for:
- **Implementation chains**: Tasks with direct dependencies (Task A → Task B → Task C)
- **Feature completeness**: Groups of tasks that together deliver a complete, testable feature
- **Logical boundaries**: Natural stopping points where a feature is functional and can be committed

If a task has no logical follow-ups or dependencies, you may work a single task, but this is ONLY for that specific case. Err on the side of task batches.

ALWAYS USE THE MCP TO INTERACT WITH TASK MASTER. DO NOT INVOKE THE `task-master` COMMAND LINE TOOL.

**TodoList Structure for Task Master Batches**:
1. **Create a feature branch** for the batch (e.g., `feature/health-check-implementation`)
2. **Use `memory-searcher-v1`** at the start of the batch to gather all relevant context for the entire feature area
3. **Add each Task Master task as a separate TodoList item** with explicit task ID references (e.g., "Complete Task 1: Install @fastify/under-pressure plugin")
4. **Work through each task sequentially** as part of the complete implementation unit
5. **Use `code-reviewer-v1`** to review the entire batch as a cohesive feature
6. **Commit and merge** only after the complete logical unit is done

For example, if Tasks 1-8 form a health check implementation batch, create TodoList items for each: "Complete Task 1: Install package", "Complete Task 2: Create infrastructure", "Complete Task 3: Implement core functionality", etc. This ensures no Task Master tasks are skipped and provides clear visibility into progress through each step.

**Context Discovery**: At the start of multi-step tasks, unfamiliar domains, or when encountering new concepts, invoke the `memory-searcher-v1` sub-agent to discover relevant pre-existing context from basic-memory. Provide it with:
- Your current task context
- Specific concepts/areas to investigate
- What you already know to avoid redundancy
- Required depth level

This prevents rabbit holes and ensures you're building on existing knowledge rather than duplicating work or missing important constraints.

**Search Sequence**:
1. Use `memory-searcher-v1` for internal context discovery
2. Use web search for external/current information on new concepts
3. Build TodoList informed by discovered constraints and patterns

Whenever generating a todo list for a Task Master or for an involved, multi-step direction directly from a human operator, include the following steps at the end:

```
- Evaluate what you've done for new or updated information to store in basic-memory
- Stage changes in Git
- Write a clear, quality commit message and commit it
- Invoke the `code-reviewer-v1` sub-agent
  - Provide, as appropriate, the Task Master task or a comprehensive description of the operator's request and all relevant information
  - The sub-agent has access to the Git context, so you don't have to give it a list of files provided
- Review the sub-agent's recommendations
  - Treat the sub-agent's recommendations about code quality fairly but skeptically; if you disagree strongly with its conclusions, stop and ask for operator assistance.
  - The sub-agent will also recommend places to add or update our basic-memory; treat these authoritatively, but only AFTER the code review itself is complete
  - The sub-agent will also review the work for alignment to the provided task. This IS authoritative, and if the sub-agent claims the changed code doesn't accomplish the task, immediately stop and ask for operator assistance.
- Once any needed changes resolve, including human oversight, commit those changes to your branch and ask the operator to merge it back.
```

## Web Search
Use web search expansively to ensure you have up-to-date context on concepts introduced by the human operator, particularly things that seem like third-party libraries, protocols, or projects.

Prefer Tavily search. If it isn't available, fall back to Brave Search. If that isn't available, use your built-in web search operator.

Consider whether or not it is a good idea to add what you've learned through web search to basic-memory. If you are unsure if it has long-term value, ask the human operator to decide.

## When Using Third-Party Code

Many parts of this codebase use open-source and third-party code. **ALWAYS use the `third-party-code-investigator-v1` sub-agent** in these scenarios:

### For New Dependencies
When considering adding any new third-party package, library, or dependency:
- **Before installation**: Invoke `third-party-code-investigator-v1` to research the package thoroughly
- Get comprehensive intelligence on security, maintenance status, documentation quality
- Understand integration requirements and potential conflicts
- Verify the package meets our needs before adding it to the project
- Make sure to install the package using the appropriate tool (`pnpm`, `poetry`, etc.). Do not add it directly to a `package.json` or `pyproject.toml` file
- Make sure to add the dependency to the correct package for the project. Only repo-wide tools are added to the root package.
  - `cd` to the correct package directory and only then run `pnpm add`. never pass `-w` without explicit operator instructions.

### For Existing Dependencies
When you're about to work with an existing third-party package in the codebase:
- **Before implementation**: Use `third-party-code-investigator-v1` to refresh your knowledge
- Get up-to-date documentation links and best practices
- Understand current API patterns and recommended usage
- Identify any recent changes or security considerations

### Investigation Triggers
Call the investigator agent whenever you encounter:
- A new package.json/requirements.txt/Cargo.toml dependency
- References to third-party libraries in existing code
- Task Master tasks involving external packages
- Implementation work requiring third-party integration
- Questions about package capabilities or proper usage

### Expected Output
The agent will provide:
- Current package versions and registry information
- Direct links to canonical documentation (e.g., docs.temporal.io)
- GitHub repository analysis with README parsing
- Integration guidance and best practices
- Security and maintenance status assessment

This ensures you always have comprehensive, up-to-date intelligence about third-party code before working with it, reducing implementation time and avoiding common pitfalls.
