# Claude Code Instructions
**All imports in this document should be treated as if they were in the main CLAUDE.md file.**

## MCP Orientation Instructions
@./.taskmaster/CLAUDE.md
@.claude/mcp-descriptions/basic-memory.mdc
@.claude/mcp-descriptions/git-mcp.mdc
@.claude/mcp-descriptions/brave-search.mdc
@.claude/mcp-descriptions/tavily-search.mdc

## Extra References
Some references are used both by you and your sub-agents, to provide agreed-upon modes of working.

@.claude/custom-instructions/knowledge-management.mdc

## Knowledge Management and Task Management

Task Master likes to create several tasks for a single problem. Group together relevant tasks when building your TodoList. 

**Task Batching**: When working with Task Master tasks, identify and work on tightly coupled task sequences as cohesive units rather than stopping after each individual task. Look for:
- **Implementation chains**: Tasks with direct dependencies (Task A → Task B → Task C)
- **Feature completeness**: Groups of tasks that together deliver a complete, testable feature
- **Logical boundaries**: Natural stopping points where a feature is functional and can be committed

For task batches:
1. **Create a feature branch** for the batch (e.g., `feature/health-check-implementation`)
2. **Use `memory-searcher-v1`** at the start of the batch to gather all relevant context for the entire feature area
3. **Work through the complete sequence** as one implementation unit
4. **Use `code-reviewer-v1`** to review the entire batch as a cohesive feature
5. **Commit and merge** only after the complete logical unit is done

For example, instead of stopping after "install package", continue through "create infrastructure" → "implement core functionality" → "configure routes" → "register plugin" as a single work unit on a feature branch. Stop and check in with the operator only at logical completion boundaries.

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
- Invoke the `code-reviewer-v1` sub-agent
  - Provide, as appropriate, the Task Master task or a comprehensive description of the operator's request and all relevant information
  - The sub-agent has access to the Git context, so you don't have to give it a list of files provided
- Review the sub-agent's recommendations
  - Treat the sub-agent's recommendations about code quality fairly but skeptically; if you disagree strongly with its conclusions, stop and ask for operator assistance.
  - The sub-agent will also recommend places to add or update our basic-memory; treat these authoritatively, but only AFTER the code review itself is complete
  - The sub-agent will also review the work for alignment to the provided task. This IS authoritative, and if the sub-agent claims the changed code doesn't accomplish the task, immediately stop and ask for operator assistance.
- Propose a quality commit message to the operator and ask for permission to commit
```

## Web Search
Use web search expansively to ensure you have up-to-date context on concepts introduced by the human operator, particularly things that seem like third-party libraries, protocols, or projects.

Prefer Tavily search. If it isn't available, fall back to Brave Search. If that isn't available, use your built-in web search operator.

Consider whether or not it is a good idea to add what you've learned through web search to basic-memory. If you are unsure if it has long-term value, ask the human operator to decide.