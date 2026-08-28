# Architecture

A detailed reference for how `claude-skill-directory` is built: the skill
archive, the taxonomy, the plugin/MCP catalog, the build harness (scripts +
CI), and the published directory site. For a shorter orientation and the
public API quick-start, see [README.md](../README.md). For where a fix
belongs, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## What this repository is

A single self-contained archive-and-publish pipeline for Claude Code skills,
plugins, and their metadata, aggregated from GitHub and community sources.
It is not itself a set of Claude Code skills to install — it is the tooling
and data that produce a searchable directory of *other* people's skills,
published as a static site over GitHub Pages plus a versioned JSON API.

Three things live in one repo on purpose (see the 2026-08-28 single-repo
collapse in the project history): the discovery/import pipeline, the
generated archive and indexes, and the published site. Nothing here syncs
from or to another repository.

## Repository layout

```
claude-skill-directory/
├── skills/<category>/<skill>/          # the archive (see "Skill archive")
│   ├── SKILL.md                        # frontmatter + instructions
│   └── metadata.json                   # attribution/license (required)
├── registry.json                       # compat pointer to the full registry
├── registry-manifest.json              # full registry manifest
├── registry-shards/                    # bounded registry parts (00.json, 01.json, ...)
├── registry_summary.json               # counts-only summary
├── docs/                                # GitHub Pages root (the published site)
│   ├── index.html, css/, js/            # web search UI (hand-owned)
│   ├── search-index-lite.json           # dedup catalog w/ quality+security+install signals
│   ├── search-index*.json(.gz), search-shards/     # bounded full-text search index
│   ├── quality-index*.json(.gz), quality-shards/   # quality scoring signals
│   ├── security-index*.json(.gz), security-shards/ # security scan signals
│   ├── ranking-index*.json(.gz), ranking-shards/   # ranking signals
│   ├── categories/                      # per-category manifest + bounded parts
│   ├── featured.json, plugins.json, stats.json, category-taxonomy.json
│   └── *.md                             # hand-owned design docs (this file included)
├── sources/                             # what to import (hand-owned lists + crawl output)
│   ├── anthropic.json, community.json   # curated/submitted sources
│   ├── github_search.json, discovered.json, crawled.json, skillsmp.json  # crawl output
│   ├── plugins.json                     # plugin catalog source
│   ├── security_blocklist.json          # repos excluded from ingestion
│   ├── acquisition_manifest.json        # provenance ledger
│   └── learning/                        # discovery heuristics (priors/observations)
├── crawler/                             # discovery + download library code
│   ├── config.py, skill_parser.py, skillsmp_sync.py
├── scripts/                             # the build harness (60+ pipeline scripts, see below)
├── taxonomy/categories.yaml             # canonical categories, governance, legacy migrations
├── schema/                              # JSON Schemas: skill, metadata, plugin
├── supabase/                            # schema.sql (hand-owned) + migrations/ (immutable once applied)
├── tests/                               # pipeline test suite
├── .github/workflows/                   # CI: deploy-pages.yml, metadata-compliance.yml
├── THIRD_PARTY_NOTICES.md               # generated attribution notices for every archived skill
└── README.md, CONTRIBUTING.md, SECURITY.md, CHANGELOG.md, LICENSE
```

## Generated vs. hand-owned

This is the load-bearing distinction in the repo. Generated paths are
overwritten by `scripts/regenerate.sh` on every pipeline run — hand edits to
them do not stick:

| Generated (do not hand-edit) | Hand-owned (fixes belong here) |
|---|---|
| `skills/**` | `scripts/`, `crawler/` — pipeline logic |
| `registry.json`, `registry_summary.json`, `registry-manifest.json`, `registry-shards/**` | `sources/` — skill source lists |
| `docs/search-index*`, `docs/search-shards/**` | `schema/`, `taxonomy/` — validation + category definitions |
| `docs/quality-index*`, `docs/quality-shards/**` | `docs/index.html`, `docs/css/`, `docs/js/`, and Markdown under `docs/` |
| `docs/security-index*`, `docs/security-shards/**` | `.github/workflows/` — automation |
| `docs/ranking-index*`, `docs/ranking-shards/**` | `supabase/schema.sql` (files under `supabase/migrations/` are immutable once applied) |
| `docs/categories/**`, `docs/stats.json`, `docs/featured.json`, `docs/plugins.json` | Root docs: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` |
| `THIRD_PARTY_NOTICES.md` | |

To correct an archived skill: fix it upstream (recorded as `source_url` in
its `metadata.json`) so the next refresh picks it up, or fix the importer
script/source entry if the pipeline is misclassifying or mis-rendering it.
Never delete a skill directory to resolve a naming conflict — rename with a
suffix instead (see Pipeline invariants below).

## Skill archive

Canonical layout: `skills/<category>/<skill>/SKILL.md` +
`skills/<category>/<skill>/metadata.json`, one directory per archived skill,
one top-level directory per canonical category (40 today — see Taxonomy).

**`schema/skill.schema.json`** validates `SKILL.md` frontmatter: `name`
(kebab-case), `description` (10–500 chars), and optional `version`, `author`,
`license`, `tags`, `category`, `model` (`sonnet`/`opus`/`haiku`), `tools`
(`read`/`write`/`edit`/`bash`/`grep`/`glob`/`webfetch`/`websearch`/`ask`/`lsp`),
`requires_network`, `requires_approval`, `homepage`, `repository`, `keywords`.

**`schema/metadata.schema.json`** validates `metadata.json` — this is the
attribution/license record and is required, not optional: `name`, `repo`,
`category`, `dir_name`, `author`, `source_url`, `license`, `copyright`,
`permission_note`, and `distribution` (`compatible` or `restricted`).
`restricted` entries are not MIT-compatible by default and need explicit
upstream permission before redistribution. This is what
`THIRD_PARTY_NOTICES.md` is generated from, and why: repository-level MIT
covers this repo's own pipeline code, never the third-party skill content
under `skills/**`, which keeps its original license.

## Taxonomy

`taxonomy/categories.yaml` (schema v2) is the single source of truth for
categories — pipeline scripts read it instead of keeping their own lists.
Validate it with `python scripts/check_taxonomy_governance.py`.

Each of the 40 canonical categories carries a `slug`, short `code`, optional
`parent` (for the display hierarchy), `display_name`, an `inclusion_rule`,
an `exclusion_rule` naming the category a look-alike skill should go to
instead, and `keywords`/`examples` used by the classifiers.

| Category | Code | Parent | Category | Code | Parent |
|---|---|---|---|---|---|
| agent | agent | ai-ml | orchestration | orchestration | ai-ml |
| ai-llm | ai-llm | ai-ml | other | oth | — |
| ai-ml | ai-ml | — | performance | performance | development |
| analysis | analysis | data | personal-development | personal-development | domains |
| api | api | development | planning | planning | productivity |
| bash | bash | development | platform | platform | devops |
| business | business | — | product | prd | — |
| c-level | c-level | business | productivity | pro | — |
| communication | communication | creative | quality | quality | development |
| context-management | context-management | ai-ml | security | sec | — |
| creative | creative | — | skills | skills | development |
| data | dat | — | system | system | devops |
| design | des | — | testing | tst | development |
| development | dev | — | workflow | workflow | productivity |
| devops | ops | — | writing | writing | creative |
| documents | doc | data | domains | domains | — |
| examples | examples | development | forensics | forensics | security |
| gaming | gaming | domains | generation | generation | creative |
| integration | integration | development | language | language | creative |
| local-ai-infrastructure | local-ai-infrastructure | devops | marketing | mkt | business |

`other` is an explicit, shrinking fallback bucket, not a resting place —
"do not use when a specific canonical category applies." Legacy/duplicate
category names (`machine-learning`, `dev`, `docs`, `test`,
`technical-integration`, `war-room`, and ~30 more) are mapped to their
canonical target in `legacy_migrations` and are accepted only as diagnostic
input, never as a publish category.

**Auditing category quality** (this is the "optimize the skills" lever):

- `python scripts/audit_category_quality.py --skills-dir skills` — fast
  full-archive pass over metadata/paths; add `--include-frontmatter` to also
  check frontmatter/category drift. Also flags non-standard nested paths
  (`category/category/skill/SKILL.md`).
- `python scripts/normalize_skill_depth.py --skills-dir skills --json` —
  review the exact move plan for those nesting issues before applying.
- `python scripts/plan_category_migration.py --skills-dir skills --output category-migration-plan.json`
  — review-only semantic reclassification plan: action, confidence, source/target
  category, keyword signals, reason, per skill. Does not move files.
- `python scripts/review_category_plan_with_llm.py --plan category-migration-plan.json ...`
  — optional bounded second-pass model review (needs `MIMO_API_KEY`); append-only
  JSONL checkpoint so long reviews can resume.
- `python scripts/apply_category_migration.py` — actually moves files, once a
  plan has been reviewed.
- `python scripts/check_category_artifacts.py --categories-dir docs/categories`
  — CI gate stopping legacy per-category JSON files from silently growing back
  into unbounded full-payload files.

## Sources and crawler (how skills get in)

`sources/*.json` is the intake layer:

| File | Role |
|---|---|
| `anthropic.json` | Curated official-source list |
| `community.json` | Hand/PR-submitted entries (the contribution path in CONTRIBUTING.md) |
| `github_search.json`, `discovered.json`, `crawled.json` | Crawler output — GitHub topic/code search results |
| `skillsmp.json` | Synced from the SkillsMP marketplace |
| `plugins.json` | Plugin catalog source (bundled skills + commands + hooks) |
| `security_blocklist.json` | Repos excluded from ingestion outright |
| `acquisition_manifest.json` | Provenance ledger (version, counts, entries) |
| `learning/` | `discovery_priors.json`, `discovery_candidates.jsonl`, `discovery_observations.jsonl` — heuristics the discovery step tunes over time |

`crawler/` is the library code that does the finding and normalizing:
`config.py` (crawl configuration), `skill_parser.py` (parses `SKILL.md` +
frontmatter out of arbitrary repos), `skillsmp_sync.py` (SkillsMP marketplace
sync). `scripts/discover_by_topic.py`, `scripts/discover_plugins.py`,
`scripts/search_sources.py`, `scripts/clone_and_import.py`, and
`scripts/download_v2.py` / `scripts/sync_and_download.py` drive the actual
discover → clone → import run on top of this library.

## Plugins and MCP

Plugins are a distinct catalog from skills: a plugin is a bundle of skills,
slash commands, and hooks distributed as an installable package (e.g. an
`npx` install), not a single `SKILL.md`. `schema/plugin.schema.json`
validates entries: `name`, `description`, `repo` (required), plus
`category`, `tags`, `install`, `homepage`, `author`, `skills[]`,
`commands[]`, `hooks[]`, `source_url`, `license`.

MCP is not a separate top-level catalog here — it surfaces as a `tags: [...,
"mcp"]` marker on plugin entries in `docs/plugins.json` (e.g. `claude-flow`,
tagged `agent`/`multi-agent`/`swarm`/`orchestration`/`mcp`, ships an MCP-based
hook install). `scripts/plugin_index.py` and `scripts/discover_plugins.py`
build and refresh that catalog; `scripts/index_artifacts.py` and
`scripts/artifact_api_records.py` fold it into the published artifact API
alongside the skill indexes.

## Build harness (the pipeline)

`scripts/regenerate.sh` is the harness entry point — "regenerate every
generated artifact in this repository, in place." Run it after any change
to `skills/`, `sources/`, or `taxonomy/`; CI (see below) expects its full,
validated sequence to pass.

```
1. rebuild_registry.py       skills/ + taxonomy → registry.json, registry-shards/, docs/categories/
2. build_registry_summary.py registry.json + sources/plugins.json → registry_summary.json
3. security_scanner.py       skills/ → security evidence report (--report-only, feeds step 4)
4. build_search_index.py     skills/ + security report → docs/ search/quality/ranking/security indexes+shards
   -- gate below only runs unless --no-validate --
5. check_canonical_categories.py   published categories must be canonical (taxonomy-backed)
6. check_generated_file_sizes.py   generated artifacts stay within bounded-shard limits
7. check_category_artifacts.py     legacy per-category JSON stays a small pointer, not a full payload
8. check_artifact_api.py           validates the static artifact API v1 contract
9. check_metadata_compliance.py    advisory full-archive scan → THIRD_PARTY_NOTICES.md
```

Beyond the harness entry point, `scripts/` holds ~60 single-purpose tools
grouped by job:

| Group | Scripts |
|---|---|
| Discovery / intake | `discover_by_topic.py`, `discover_plugins.py`, `search_sources.py`, `clone_and_import.py`, `download_v2.py`, `sync_and_download.py`, `sync_download.py`, `sync_download_support.py`, `sync_missing_skills.py`, `sync_pipeline.py`, `sync_pipeline_support.py`, `validate_sources.py` |
| Taxonomy / categorization | `category_taxonomy.py`, `audit_category_quality.py`, `audit_category_residuals.py`, `plan_category_migration.py`, `apply_category_migration.py`, `review_category_plan_with_llm.py`, `classify_residual_workset_with_llm.py`, `sample_category_classification_audit.py`, `report_canonical_category_targets.py`, `build_current_other_reclassification_batch.py`, `build_other_residual_governance_report.py`, `build_residual_category_worksets.py`, `check_taxonomy_governance.py`, `check_canonical_categories.py` |
| Layout / naming integrity | `normalize_skill_depth.py`, `normalize_skill_dirs.py`, `check_case_conflicts.py`, `check_registry_shard_placement.py`, `plan_stable_key_duplicate_cleanup.py`, `portable_paths.py`, `utils.py` |
| Security | `security_scanner.py`, `security_rules.py`, `security_blocklist.py`, `security_scope.py`, `resolve_security_scope.py`, `remediate_archive_security.py` |
| Legal / metadata / assets | `backfill_legal_metadata.py`, `check_metadata_compliance.py`, `skill_frontmatter.py`, `asset_claims.py`, `audit_skill_assets.py`, `backfill_skill_assets.py`, `skill_asset_audit.py`, `verify_upstream_assets.py` |
| Indexing / publish artifacts | `rebuild_registry.py`, `build_registry_summary.py`, `build_search_index.py`, `plugin_index.py`, `index_artifacts.py`, `artifact_api_records.py`, `check_artifact_api.py`, `check_generated_file_sizes.py`, `check_category_artifacts.py` |
| Health / drift checks | `check_sync_pipeline_health.py`, `check_community_intake_diff.py`, `check_coverage_ratchet.py`, `archive_preflight.py`, `test_discovery.py` |

## Published artifact API

The published surface (versioned, see `docs/artifact-api-contract.md`) is
served two ways: GitHub Pages (`https://shivamchopra7.github.io/claude-skill-directory/…`)
for the indexes/shards the web UI reads, and `raw.githubusercontent.com` for
the registry files. Everything follows a manifest/pointer + bounded-shards
pattern so no single JSON file grows unbounded as the archive grows:

- `search-index-lite.json` — dedup catalog with quality/security/install signals (small, fast)
- `search-index.json` (+ `.gz`) — compatibility pointer; `search-index-manifest.json` + `search-shards/part-NNN.json` hold the real bounded full-text data
- `quality-index*`, `security-index*`, `ranking-index*` — same manifest+shards pattern, one signal family each
- `registry.json` — compatibility pointer; `registry-manifest.json` + `registry-shards/NN.json` hold the full registry
- `categories/index.json` (counts) + `categories/<category>/manifest.json` + `part-NNN.json` (payload); the legacy `categories/<category>.json` URL is now a small compatibility pointer only

## CI/CD

Two workflows remain after the 2026-08-28 single-repo collapse (the old
`publish-from-core.yml` cross-repo sync and `sync-data.yml` were removed —
there is no longer an upstream to sync from):

- **`deploy-pages.yml`** — on push to `main` (ignoring `skills/**`, `tests/**`,
  issue/PR templates, `THIRD_PARTY_NOTICES.md`), publishes `docs/` to GitHub
  Pages.
- **`metadata-compliance.yml`** — on PRs touching `skills/**`, `scripts/**`,
  `schema/**`, or `README.md` (or manual dispatch with `changed`/`full`
  scope), runs `check_metadata_compliance.py` against changed files, checks
  the README still carries the Third-Party License & Attribution section, and
  uploads the compliance report + `THIRD_PARTY_NOTICES.md` as artifacts.

Note: there is currently no scheduled workflow re-running discovery/crawl or
`regenerate.sh` on a cadence — the README's "Daily Updates" describes the
pipeline's intended cadence, but the recurring trigger for it is not present
in `.github/workflows/` today. Running `scripts/regenerate.sh` (and the
discovery scripts feeding `sources/`) is a manual or externally-scheduled
step until that's re-added.

## Security

- `scripts/security_scanner.py` scans the full archive during
  `regenerate.sh` (`--report-only`) and its findings feed both
  `docs/security-index*`/`security-shards/` and `THIRD_PARTY_NOTICES.md`
  generation.
- `scripts/security_rules.py` / `security_scope.py` / `resolve_security_scope.py`
  define and resolve what gets scanned; `security_blocklist.py` +
  `sources/security_blocklist.json` keep specific repos out of ingestion
  entirely; `remediate_archive_security.py` is the remediation path when the
  scanner flags something already archived.
- See `SECURITY.md` and `docs/SECURITY_GUIDE.md` /
  `docs/SECURITY_SYSTEM_OVERVIEW.md` for the policy-level view.

## Contributing quick reference

- New skill: open an issue, or PR an entry into `sources/community.json`
  (see CONTRIBUTING.md for the exact shape).
- Pipeline invariants that must hold for any archive-layout change: no two
  paths may differ only by case (breaks case-insensitive filesystem
  checkouts); use `normalize_name()` / `ensure_unique_dir()` for new skill
  directories; conflict suffix order is repo-suffix → short-hash → numeric;
  reuse a directory when the metadata key already resolves to the same
  skill; never delete a skill to resolve a conflict, rename it instead.
- Full details: [CONTRIBUTING.md](../CONTRIBUTING.md).
