# Fast clone / update (repo has lots of files)

Claude Skill Directory is one self-contained repository, but it mixes two very
different kinds of content:

- pipeline + docs + generated indexes (`scripts`, `docs`, `sources`, `schema`) — relatively light
- the archived skill tree (`skills/`) — very heavy

A normal `git clone` / `git pull` can feel slow because Git needs to update and scan a very large working tree.

If you only need the registry + tooling (scripts/docs) and not the full skill archive, use **partial clone + sparse checkout**.

## New clone (recommended)

```bash
git clone --filter=blob:none --sparse https://github.com/shivamchopra7/claude-skill-directory.git
cd claude-skill-directory
git sparse-checkout set --cone docs scripts sources schema
```

If you only need counts, prefer `registry_summary.json` instead of opening the full `registry.json`.

## Adding the skill archive

If you need archived skills locally, add only the categories you actually use
rather than the whole `skills/` tree:

```bash
git sparse-checkout add skills/development skills/documents
```

Need more categories later?

```bash
git sparse-checkout add skills/data skills/design skills/testing
```

Starting from scratch and expecting to pull a lot of archive history? Start
shallow as well:

```bash
git clone --filter=blob:none --depth 1 --sparse https://github.com/shivamchopra7/claude-skill-directory.git
```

## Existing clone: switch to sparse checkout

```bash
git sparse-checkout init --cone
git sparse-checkout set --cone docs scripts sources schema
```

## Get the full checkout (slow)

If you truly need everything:

```bash
git sparse-checkout disable
```

This pulls the entire skill archive onto disk. Avoid it unless you really need it.

## Optional: Git performance tuning

These settings can help on large repos:

```bash
git config feature.manyFiles true
git config core.untrackedCache true
git maintenance start
```

## Don’t clone at all (fastest)

If you just want the data, prefer direct JSON fetches:

- Summary counts: `registry_summary.json` (GitHub raw)
- Full registry: `registry.json` (GitHub raw, much larger)
- Lightweight search: `docs/search-index.json` (or `.gz`)
