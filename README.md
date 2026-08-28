# Claude Skill Directory

<p align="center">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fshivamchopra7.github.io%2Fclaude-skill-directory%2Fstats.json&query=%24.archive_skill_md_count_raw&label=SKILL.md%20files%20(raw)&color=blueviolet&style=flat-square" alt="SKILL.md files (raw)">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fshivamchopra7.github.io%2Fclaude-skill-directory%2Fstats.json&query=%24.registry_skill_count_dedup&label=Skills%20(dedup)&color=purple&style=flat-square" alt="Skills (dedup)">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fshivamchopra7.github.io%2Fclaude-skill-directory%2Fstats.json&query=%24.total_plugins&label=Plugins&color=1f6feb&style=flat-square" alt="Plugins">
  <img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fshivamchopra7.github.io%2Fclaude-skill-directory%2Fstats.json&query=%24.updated_at&label=Updated%20UTC&color=2ea043&style=flat-square" alt="Updated UTC">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License">
  <a href="https://shivamchopra7.github.io/claude-skill-directory/"><img src="https://img.shields.io/badge/Web-Search-blue?style=flat-square" alt="Web Search"></a>
</p>

> The most comprehensive directory of Claude Code skills — updated daily with the latest skills

## What is this?

The largest searchable index of Claude Code skills, aggregated from GitHub and
community sources. Discovery, download, deduplication, security scanning, index
generation, and the published site all live in this one repository.

**Two ways to use:**
1. **[Web Search](https://shivamchopra7.github.io/claude-skill-directory/)** - Fast browser-based search
2. **API** - Direct JSON access over GitHub Pages or `raw.githubusercontent.com`

Maintained by Shivam Chopra.

## Highlights

- **Massive Skill Index** - Deduplicated, high-quality directory (see badge for live count)
- **Rich Categories** - Development, Testing, DevOps, Design, and more
- **Daily Updates** - Automated crawling and validation by scheduled workflows
- **Quality Indexed** - Metadata, descriptions, and star counts
- **Lightweight Search** - Gzip-compressed index for fast client-side search

## Generated vs Hand-Owned

Most of this repository is build output. Do not hand-edit the generated paths —
they are overwritten on the next pipeline run:

- `skills/**`
- `registry.json`, `registry_summary.json`, `registry-manifest.json`, `registry-shards/**`
- `docs/search-index*`, `docs/search-shards/**`
- `docs/quality-index*`, `docs/quality-shards/**`
- `docs/security-index*`, `docs/security-shards/**`
- `docs/ranking-index*`, `docs/ranking-shards/**`
- `docs/categories/**`, `docs/stats.json`, `docs/featured.json`, `docs/plugins.json`
- `THIRD_PARTY_NOTICES.md`

Everything else — `scripts/`, `crawler/`, `sources/`, `schema/`, `taxonomy/`,
`docs/index.html`, `docs/css/`, `docs/js/`, `.github/workflows/`, and the root
documentation — is hand-owned and is where real changes belong. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Quick Start

### Option 1: Web Search

Visit [https://shivamchopra7.github.io/claude-skill-directory/](https://shivamchopra7.github.io/claude-skill-directory/)

For clone/update tips on large repositories, see [docs/FAST_CLONE.md](docs/FAST_CLONE.md).

### Option 2: Direct API

The public JSON surface is versioned in
[docs/artifact-api-contract.md](docs/artifact-api-contract.md). Use that
contract when integrating with pointer files, manifests, shards, gzip variants,
and deprecation markers.

```bash
# Startup search index and bounded full-search shards
curl https://shivamchopra7.github.io/claude-skill-directory/search-index.json
curl https://shivamchopra7.github.io/claude-skill-directory/search-index-manifest.json
curl https://shivamchopra7.github.io/claude-skill-directory/search-shards/part-000.json

# Deduplicated catalog index with quality/security/install signals
curl https://shivamchopra7.github.io/claude-skill-directory/search-index-lite.json
curl https://shivamchopra7.github.io/claude-skill-directory/quality-index.json
curl https://shivamchopra7.github.io/claude-skill-directory/quality-index-manifest.json
curl https://shivamchopra7.github.io/claude-skill-directory/quality-shards/part-000.json
curl https://shivamchopra7.github.io/claude-skill-directory/security-index.json
curl https://shivamchopra7.github.io/claude-skill-directory/security-index-manifest.json
curl https://shivamchopra7.github.io/claude-skill-directory/security-shards/part-000.json
curl https://shivamchopra7.github.io/claude-skill-directory/ranking-index.json
curl https://shivamchopra7.github.io/claude-skill-directory/ranking-index-manifest.json
curl https://shivamchopra7.github.io/claude-skill-directory/ranking-shards/part-000.json

# Lightweight registry summary (counts only)
curl https://raw.githubusercontent.com/shivamchopra7/claude-skill-directory/main/registry_summary.json

# Full registry manifest and shards
curl https://raw.githubusercontent.com/shivamchopra7/claude-skill-directory/main/registry-manifest.json
curl https://raw.githubusercontent.com/shivamchopra7/claude-skill-directory/main/registry-shards/00.json

# Compatibility registry pointer
curl https://raw.githubusercontent.com/shivamchopra7/claude-skill-directory/main/registry.json

# Category manifest and bounded parts
curl https://shivamchopra7.github.io/claude-skill-directory/categories/index.json
curl https://shivamchopra7.github.io/claude-skill-directory/categories/development/manifest.json
curl https://shivamchopra7.github.io/claude-skill-directory/categories/development/part-000.json

# Legacy category pointer
curl https://shivamchopra7.github.io/claude-skill-directory/categories/development.json
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Data Collection                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ GitHub Crawl │→ │ Download     │→ │ Security     │          │
│  │ (discover)   │  │ (sync)       │  │ (scanner)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Index Generation                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ search-index   │  │ categories/    │  │ featured.json  │    │
│  │ .json          │  │ *.json         │  │ (featured set) │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Consumption                                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ Web UI         │  │ JSON Shards    │  │ API            │    │
│  │ (GitHub Pages) │  │ (bounded)      │  │ (JSON)         │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Search Index Schema

```typescript
// Lightweight index for fast search
interface SearchIndex {
  v: string;           // Version (date)
  t: number;           // Indexed skill count (always s.length)
  s: SkillMini[];      // Skills array
}

interface SkillMini {
  n: string;           // name
  d: string;           // description (truncated 80 chars)
  c: string;           // category code (dev, ops, sec, etc.)
  g: string[];         // tags (max 5)
  r: number;           // stars
  i: string;           // install path
}
```

---

## Repository Layout

```
claude-skill-directory/
├── registry.json           # Compatibility registry pointer
├── registry-manifest.json  # Full registry manifest
├── registry-shards/        # Bounded registry parts
├── skills/                 # Archived skill tree (<category>/<skill>/SKILL.md)
├── docs/                   # GitHub Pages
│   ├── index.html          # Web search UI
│   ├── search-index-lite.json
│   ├── search-index.json   # Compatibility pointer to bounded shards
│   ├── search-index-manifest.json
│   ├── search-shards/      # Bounded full search index parts
│   ├── featured.json       # Featured skills snapshot
│   └── categories/         # Category manifests and bounded parts
├── sources/                # Data sources
│   ├── anthropic.json
│   ├── community.json
│   └── skillsmp.json
├── taxonomy/               # Canonical category definitions
├── schema/                 # JSON Schema for SKILL.md frontmatter
├── crawler/                # Discovery/download library code
└── scripts/                # Build scripts
    ├── build_search_index.py
    ├── discover_by_topic.py
    ├── security_scanner.py
    └── ...
```

---

## Categories

Canonical category slugs, short codes, governance status, and heuristic keywords
live in `taxonomy/categories.yaml`. Pipeline scripts read that file instead of
keeping their own category lists. Legacy category names are diagnostic inputs
only; they are routed to review and are not accepted as publish categories.
Validate the taxonomy itself with `python scripts/check_taxonomy_governance.py`.
To validate publish output against canonical categories, pass repeated
`--publish-category <slug>` values. To review category quality across the
archive before moving anything, run
`python scripts/audit_category_quality.py --skills-dir skills`.
The default audit uses metadata and paths for a fast full-archive pass; add
`--include-frontmatter` when checking frontmatter/category drift.
The audit also reports non-standard nested skill paths such as
`category/category/skill/SKILL.md`.
For those layout issues, use
`python scripts/normalize_skill_depth.py --skills-dir skills --json` to review
the exact move plan before applying it.
For semantic reclassification, generate a review-only migration plan with
`python scripts/plan_category_migration.py --skills-dir skills --output category-migration-plan.json`.
The plan records action, confidence, source categories, target category, keyword
signals, and reason for every proposed change; it does not move files.
For a bounded second-pass model review, set `MIMO_API_KEY` and run
`python scripts/review_category_plan_with_llm.py --plan category-migration-plan.json --output category-llm-review.json --checkpoint-jsonl category-llm-review.checkpoint.jsonl --resume`.
The default endpoint is `https://token-plan-sgp.xiaomimimo.com/v1` with
`mimo-v2.5-pro`. The default request uses `--thinking disabled` and
`--max-completion-tokens 1024` so the model output budget is reserved for the
required JSON; raise the token value for larger reviews, or pass
`--thinking default` when using a non-MiMo endpoint that does not accept the
provider-specific thinking field. The report remains review-only: it records
model category, confidence, decision, parse status, token/thinking policy, and
evidence without modifying the archive.
The checkpoint file is append-only JSONL, so interrupted long reviews can resume
without re-calling the model for completed candidates.

Category counts are published in `categories/index.json`; full category payloads
are available through `categories/<category>/manifest.json` and bounded
`part-*.json` files. The legacy `categories/<category>.json` URL is now a small
compatibility pointer. The publish path runs
`python scripts/check_category_artifacts.py --categories-dir docs/categories` so
legacy category files cannot silently grow back into large full-payload JSON.
Common category codes include:

| Category | Code | Description |
|----------|------|-------------|
| `development` | `dev` | Development tools, frameworks |
| `data` | `dat` | Data processing, analysis |
| `design` | `des` | UI/UX design, frontend |
| `testing` | `tst` | Testing, QA, automation |
| `devops` | `ops` | DevOps, CI/CD, infrastructure |
| `documents` | `doc` | Document creation (docx, pdf) |
| `productivity` | `pro` | Productivity and automation |
| `product` | `prd` | Product management |
| `security` | `sec` | Security, auditing |
| `marketing` | `mkt` | Marketing, content, SEO |

---

## Roadmap

### Current Status

- [x] **Index count** tracked by the badge (`registry.json`)
- [x] **Archive size:** tracked by badge (raw `SKILL.md` count from `stats.json`)
- [x] **Daily auto-update** via GitHub Actions
- [x] **Security scanning** for all skills

### In Progress

- [x] **Lightweight search index** (gzip-compressed; see stats.json)
- [x] **Web search UI** (GitHub Pages)
- [x] **GitHub Pages deployment** (https://shivamchopra7.github.io/claude-skill-directory/)

### Planned

- [ ] **AI semantic search** (vector similarity)
- [ ] **Skill recommendations** (based on usage)
- [ ] **Version tracking** for skills
- [ ] **Skill quality scoring**
- [ ] **API rate limiting** and caching

---

## Contributing

### Add Your Skill

**Option 1: Submit via Issue**
1. Open an [issue](https://github.com/shivamchopra7/claude-skill-directory/issues/new)
2. Use the "Add Skill" template
3. Provide: repo URL, name, description, category

**Option 2: Submit via PR**
1. Fork `shivamchopra7/claude-skill-directory`
2. Add your skill to `sources/community.json`:

```json
{
  "name": "your-skill-name",
  "repo": "your-username/your-repo",
  "path": "optional/path/to/skill",
  "description": "What your skill does",
  "category": "development",
  "tags": ["testing", "automation"]
}
```

3. Open the PR against `shivamchopra7/claude-skill-directory`

### Report Issues

Feedback is welcome. Please open an issue for:
- **Bugs** - Search not working, incorrect data
- **Feature requests** - New categories, better search
- **UX improvements** - Web UI enhancements
- **Data quality** - Duplicate skills, wrong categories

👉 [Open an Issue](https://github.com/shivamchopra7/claude-skill-directory/issues/new)

### Contribute Code

```bash
# Clone without the heavy archive blobs
git clone --filter=blob:none --sparse https://github.com/shivamchopra7/claude-skill-directory.git
cd claude-skill-directory

# Pull only what you need (add more paths later as needed)
git sparse-checkout set --cone docs scripts sources schema

# Install dependencies
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# Build search index locally
python scripts/build_search_index.py --registry registry.json --output docs

# Test web UI
cd docs && python -m http.server 8000
# Visit http://localhost:8000
```

See `docs/FAST_CLONE.md` for more options (existing clones, getting full checkout, Windows notes).

---

## Other People's Projects

These are separate projects maintained by other people. They are listed for
convenience only; they are not part of this repository and are not maintained
here.

| Project | Description |
|---------|-------------|
| [anthropics/skills](https://github.com/anthropics/skills) | Official Anthropic skills |
| [SkillsMP](https://skillsmp.com) | Web-based skill marketplace |
| [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | Curated skill list |

---

## License

MIT License applies to this repository's own code and pipeline only - see
[LICENSE](LICENSE) for details. The LICENSE file retains the upstream copyright
notice from the project this repository was forked from, alongside the copyright
for the work done here.

## Third-Party License & Attribution

Third-party skills under `skills/**` keep their original licenses and copyright ownership.

- Repository-level MIT does **not** relicense third-party skill content.
- Every imported skill metadata file should include:
  - `author`
  - `source_url`
  - `license`
  - `copyright`
  - `permission_note`
  - `distribution` (`compatible` or `restricted`)
- `restricted` entries are not MIT-compatible by default and require explicit upstream permission before redistribution/use.
- Notices are generated by compliance checks into `THIRD_PARTY_NOTICES.md`.
- Metadata compliance runs in advisory mode by default to avoid blocking ingestion; strict blocking can be enabled when needed.

---

<p align="center">
  Made with ❤️ for the Claude Code community
</p>
