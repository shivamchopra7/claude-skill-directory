# Attribution Backfills

This ledger records contributor credit restored after a generated change had
already been published without its source `Co-authored-by` trailer. Entries
here are pre-automation history and must link the original contribution, the
authoritative port, and the published artifact.

The links below point at the upstream project this directory was forked from
(`majiayu000/claude-skill-registry` and its data repository). They are
deliberately **not** repointed at this repository: they are the evidence of
where a third party's contribution actually happened, and rewriting them would
break the credit this ledger exists to preserve.

## Lee — DynamoDB on-demand pricing correction

- Contributor: [Lee (`LeeroyHannigan`)](https://github.com/LeeroyHannigan)
- Original report: [main issue #54](https://github.com/majiayu000/claude-skill-registry/issues/54)
- Original patch: [main PR #53](https://github.com/majiayu000/claude-skill-registry/pull/53)
- Authoritative port: [data PR #103](https://github.com/majiayu000/claude-skill-registry-data/pull/103)
- Attributed data commit: `1884f5ff62faefcbbcd656105660254edf23fa61`
- First published main commit: `2d82af0b54ec083b2c593042a33b4255aaf1601e`

The upstream data commit preserved a `Co-authored-by: Lee <...>` trailer (the
address is intentionally not reproduced on this public page), but the old
subject-only publisher dropped it. The commit that introduces this ledger is
the non-history-rewriting attribution backfill.
