# Changelog

All notable changes to aggentctx are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.2.2] — 2026-05-17

### Added
- `agentctx update` command — re-analyzes project and appends missing sections without overwriting existing content
- `agentctx status` command — shows state of context files and detected stack with per-workspace breakdown
- `--stack <id>` flag on `init` — override automatic stack detection (e.g. `--stack nextjs`)
- shadcn/ui detection — if `components.json` is present, Next.js AGENTS.md includes UI library guidance
- Tailwind CSS detection — if `tailwind.config.*` is present, Next.js AGENTS.md includes CSS framework note
- Design System fingerprint — workspaces with `tailwind-preset.js` / `tailwind-plugin.js` now detected as `design-system` stack

### Fixed
- **AGENTS.md adaptive merge** — `--force` no longer blindly overwrites AGENTS.md; uses H2-section-aware merge that only appends missing sections
- **DESIGN.md adaptive merge** — same protection as AGENTS.md
- **Monorepo language/PM detection** — now uses workspace frequency analysis instead of root-only scan; no longer reports `unknown` for mixed-language monorepos
- Workspace with `package.json` but no lockfile now correctly defaults to `npm` instead of `unknown`
- Version number now read dynamically from `package.json` (was hardcoded `0.1.0`)
- `--force` description now accurately describes behavior (was "Overwrite existing files")

### Changed
- `WriteResult` now includes `up_to_date` field to distinguish "already current" from "skipped — use --force"
- Monorepo CLAUDE.md header now shows workspace count instead of (potentially incorrect) root package manager

---

## [0.2.1] — 2026-04-28

### Fixed
- CLAUDE.md section-aware merge now correctly handles projects with existing agentctx sections
- Writer skips CLAUDE.md write when content is identical (avoids unnecessary file touches)

### Changed
- Improved monorepo workspace detection for manual monorepos (no package.json workspaces field)

---

## [0.2.0] — 2026-04-20

### Added
- Initial release with stack detection (20 stacks), AGENTS.md / CLAUDE.md / DESIGN.md generation
- Section-aware merge for CLAUDE.md — protects existing project configuration
- `agentctx feature` subcommands (add, update, list, check)
- `agentctx deploy` subcommands (add, show, scan)
- `agentctx hook install/uninstall` — git post-commit hook for automatic context updates
- `agentctx validate` — structure and completeness validation
- Security: secret detection (15+ patterns), sensitive file filtering, path traversal protection
- Monorepo detection and per-workspace AGENTS.md generation
