# CLAUDE.md

This file provides guidance for AI agents working in this repository.

## Project

**sql2git** is a PostgreSQL to Git Exporter — a web app that periodically dumps PostgreSQL tables to JSON files and commits/pushes them to a Git repository.

- Frontend: React + Tailwind CSS (`src/`)
- Backend: Express + TypeScript (`server.ts`)
- Config/logs: SQLite via `better-sqlite3`
- Git ops: `isomorphic-git`
- Scheduling: `node-cron`

Run locally: `npm install && npm run dev` (requires `GEMINI_API_KEY` in `.env.local`)

## Issue Tracking: beads_rust (`br`)

This project uses [`beads_rust`](https://github.com/Dicklesworthstone/beads_rust) (`br`) for local issue tracking. Issues are stored in `.beads/beads.db` and exported to `.beads/issues.jsonl` for git collaboration.

### Common commands

```bash
# Create issues
br create "Fix export error handling"
br create "Add table filtering" -t feature -p 1 -d "Allow users to select which tables to export"

# List & search
br list                          # open issues (default limit 50)
br list -a                       # include closed
br list -t bug                   # filter by type
br list -p 0                     # filter by priority (0=critical)
br ready                         # open + unblocked issues (what to work on next)
br blocked                       # issues blocked by dependencies
br search "export"               # full-text search

# View details
br show <id>                     # show a single issue
br show <id> --json              # machine-readable output

# Update
br update <id> --status in_progress
br update <id> --assignee "alice" --priority 1
br close <id>
br reopen <id>

# Dependencies & blocking
br dep add <id> --blocks <other-id>
br graph                         # visualize dependency graph

# Quick capture (returns ID only — useful in scripts)
br q "Quick note or task"

# Stats & health
br stats
br doctor
br lint                          # check for missing fields
```

### Priority levels

| Value | Meaning  |
|-------|----------|
| 0     | Critical |
| 1     | High     |
| 2     | Medium   |
| 3     | Low      |
| 4     | Backlog  |

### Workflow

1. Before starting work: `br ready` to see what's next
2. Pick an issue and mark it: `br update <id> --status in_progress`
3. Do the work, commit code referencing the issue ID in the message
4. Close when done: `br close <id>`
5. Sync JSONL to git: `git add .beads/issues.jsonl && git commit`

### Agent-friendly flags

- `--json` — structured JSON output on any command
- `--quiet` / `-q` — suppress decorative output
- `--no-color` — plain text (no ANSI codes)
- `br schema` — emit JSON Schema for all output types (useful for tooling)

### Gitignore

`.beads/.gitignore` is configured to exclude the SQLite database and runtime files. Only commit:
- `.beads/issues.jsonl` — the canonical issue list
- `.beads/config.yaml` — workspace config
- `.beads/metadata.json` — workspace metadata
- `.beads/.gitignore`
