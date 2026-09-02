# .open-knowledge/ — Open Knowledge config

This directory holds Open Knowledge's configuration for this project. It's **not** where content lives — content lives wherever `content.dir` + `content.include` in `config.yml` point. The default is the repo root with `**/*.md`, so any markdown file in the project is fair game. Inspect `config.yml` for the actual setting.

## What's in here

- `config.yml` — workspace config (content dir, include/exclude globs, MCP tool settings)
- `AGENTS.md` — this file
- `cache/` — derived data (gitignored)

No scaffolded content directories. Organize knowledge wherever makes sense for the project — existing docs trees, topic-grouped subfolders, whatever. `exec("ls <dir>")` + per-file enrichment gives you a live overview of any directory on demand; there's no INDEX.md catalog to maintain.

## Navigation — prefer `exec` for all reads

`exec` is the primary MCP read surface. It runs a read-only bash command (cat, ls, grep, find, head, tail, wc, sort, uniq, cut — pipes OK) and returns raw stdout plus enriched metadata per file: title, description, tags, backlink count, recent shadow-repo activity with agent-vs-human attribution, and project git history.

Examples (adapt paths to this project's layout):

- Read a file: `exec("cat <path>.md")` — contents + full rich enrichment
- List a directory: `exec("ls <dir>")` — names + slim per-file enrichment
- Search: `exec("grep -rn <term> <dir> | head -5")` — matches + enrichment on matched files

Typed tools (`read_document`, `search`, `list_documents`, etc.) remain available as "Typed call sites (advanced)" — use them when you need the typed `structuredContent` shape for programmatic parsing.

## Suggested lifecycle (optional pattern)

Projects that want an explicit knowledge-maturation flow can organize as three tiers **relative to the content directory** — create the subfolders only when you need them:

1. **External sources** (e.g., `external-sources/` under `content.dir`) — raw content fetched from URLs, PDFs. No analysis, just preservation. Use the `ingest` MCP tool.
2. **Research** (e.g., `research/` under `content.dir`) — analysis and synthesis. Provisional findings, trade-offs, open questions. Use the `research` MCP tool.
3. **Articles** (e.g., `articles/` under `content.dir`) — canonical knowledge. Use the `consolidate` MCP tool to promote research → articles once decisions are made.

This is a pattern, not a requirement. Projects with existing layouts (`specs/`, `reports/`, `docs/`, etc.) should use those; the lifecycle exists as mental scaffolding, not as enforced filesystem structure.

## Linking — use `[[wiki-links]]` aggressively

**When writing or editing any document, link liberally to every other document it relates to.** Open Knowledge's value compounds with link density: backlinks surface cross-document context in every read, graph queries (`get_hubs` / `get_orphans`) reveal structure, and agents navigate the knowledge base by following links. A document with no outbound links is an island.

**Defaults when writing:**

- Every noun-phrase that names another document is a link. Write `[[Page Title]]` instead of plain prose when mentioning concepts, projects, decisions, or entities that have (or should have) their own page. Redlinks are fine — they signal "this should exist."
- Cross-link siblings: when creating a document in a folder, link to the 2–3 most related neighbors.
- Link back to sources instead of re-summarizing — the reader can follow.
- Prefer `[[Page]]` over Markdown `[text](./page.md)`. Wiki-links resolve by docName and participate in the backlinks index; Markdown links to other wiki files don't.

**Rule of thumb:** if a human reader would want to click a term to learn more, make it a link. Err on the side of too many links.

## Frontmatter Conventions

Open Knowledge has two metadata surfaces that merge at read time:

**Per-file frontmatter.** Every `.md` file that's part of the knowledge base should have YAML frontmatter:

```yaml
---
title: Article Title (required)
description: Brief summary (required)
tags:
  - relevant
  - tags
---
```

**Folder-level defaults via `config.yml` `folders:`.** Declare per-folder title/description/tags keyed by glob `match:` — see `config.yml` for the commented example. Rules apply in declaration order (later matches override earlier scalars), tags concat + dedup across all matching rules, and the file's own frontmatter always wins per-scalar. Folder defaults fill in blanks.

Folder metadata lives in `config.yml`, **not** in content files — this is intentionally different from the rejected `INDEX.md`-inside-content pattern. The merge is computed on every `exec("ls <dir>")` / `read_document` / `search` call and is never written back to disk.

## Scaffolding (first-time setup)

This directory was scaffolded by running `open-knowledge init` (or `npx @inkeep/open-knowledge init`) in the project root. That command:

1. Creates `.open-knowledge/` (config-only — no content subdirs)
2. Writes `AGENTS.md`, `.gitignore`, and `config.yml`
3. Registers the Open Knowledge MCP server in `.mcp.json` at the repo root

If you're onboarding a new project and `.open-knowledge/` doesn't exist yet, run `open-knowledge init` from a terminal.

## Tools

- **`exec`** — primary read surface (cat / ls / grep / find / pipes) with enriched output
- **`init-content`** — bootstrap this knowledge base from the codebase
- **`ingest`** — capture an external source as raw reference material
- **`research`** — gather sources + write provisional findings
- **`consolidate`** — promote research into canonical articles
- **Writes** via `write_document` / `edit_document` — route through the server so shadow-repo attribution (agent vs human) is captured
- **Graph queries** via `get_backlinks`, `get_forward_links`, `get_orphans`, `get_hubs`

These tools are discovered via the standard MCP `tools/list` handshake and work in any MCP client (Claude Code, Cursor, Windsurf, Codex, etc.).
