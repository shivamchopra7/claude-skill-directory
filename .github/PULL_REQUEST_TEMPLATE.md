## Summary

<!-- What changed and why? -->

## Change type

- [ ] Pipeline, script, or workflow change (`scripts/**`, `crawler/**`, `.github/**`)
- [ ] Archive correction under `skills/**`
- [ ] Site or documentation change (`docs/**`, `README.md`)
- [ ] Source list, schema, or taxonomy change (`sources/**`, `schema/**`, `taxonomy/**`)

This is a single self-contained repository: discovery, the skill archive, the
generated registry, and the published site all live here. There is no separate
pipeline or archive repository to port a change to.

## Generated files

Do not hand-edit generated outputs. `registry.json`, `registry_summary.json`,
`registry-manifest.json`, `registry-shards/**`, and `docs/search-index.json`,
`docs/stats.json`, `docs/categories/**` are rebuilt by `scripts/regenerate.sh`
and by the `Rebuild Generated Artifacts` workflow. Change the generator, then
regenerate.

`THIRD_PARTY_NOTICES.md` is produced by CI and must not be edited by hand.

## Archive correction evidence

<!-- For a skills/** correction, link the authoritative upstream source and list the affected paths. -->

## Verification

<!-- List the checks you ran: scripts/regenerate.sh, pytest, or the specific validators. -->
