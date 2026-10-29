# Agents

Agents (subagents) are specialized assistants defined in `.claude/agents/`.
Each one runs in its **own context** with its **own tool permissions**, does
one job, and reports back. Use them for work that benefits from a fresh view
(review) or that must follow a strict procedure (commit).

## Available Agents

| Agent           | Job                                             | Can edit code? | Model  |
|-----------------|-------------------------------------------------|----------------|--------|
| `verifier`      | Runs type check, lint, tests, build; reports    | No             | sonnet |
| `code-reviewer` | Independent review against project rules        | No (read-only) | opus   |
| `docs-keeper`   | Updates docs, glossary, `*.example` files, ADRs | Docs only      | sonnet |
| `git-committer` | Safety checks, logical commits, no push         | No             | sonnet |

## Standard Workflow

```
Implement  →  verifier  →  code-reviewer  →  docs-keeper  →  git-committer
              (must PASS)   (must APPROVE)     (if needed)     (when user asks)
```

- If `verifier` fails or `code-reviewer` requests changes, fix the issues and
  run that agent again before moving on.
- `git-committer` runs **only when the user asks to commit**. Claude Code will
  still ask the user to approve each commit (`ask` rule in `.claude/settings.json`).

## How to Call an Agent

- Automatically: Claude picks an agent when the task matches its `description`.
- Explicitly: "Use the code-reviewer agent to review my changes."
- Agents do not see the conversation. When delegating, pass the task, the
  files involved, and any decisions already made.

## Agents vs Skills

| Use a **skill** when…                    | Use an **agent** when…                        |
|------------------------------------------|-----------------------------------------------|
| You want a procedure in the current chat | You want an independent, isolated run         |
| The work needs the conversation context  | A fresh view helps (review, verification)     |
| Tools can stay the same                  | Tools should be restricted (read-only, no push) |

Agents can use skills: `code-reviewer` follows `.claude/skills/code-review/`.

## Reusing Agents in Every Project

- **Per project:** keep them in `.claude/agents/` and commit them, so the
  whole team gets them.
- **For you, in all projects:** copy them to `~/.claude/agents/`.
  If a project has an agent with the same name, the project version wins.
- Agents that reference project files (`CLAUDE.md`, `docs/`) work in any
  project that follows this documentation structure.

## Adding a New Agent

Create `.claude/agents/<name>.md`:

```markdown
---
name: <kebab-case-name>
description: <what it does and WHEN to use it — Claude uses this to decide>
tools: Read, Grep, Glob        # only what it needs; omit to inherit all
model: sonnet                  # sonnet | opus | haiku | inherit
---

<System prompt: role, steps, rules, and the exact report format.>
```

Then add it to the table above. You can also create agents interactively
with the `/agents` command in Claude Code.
