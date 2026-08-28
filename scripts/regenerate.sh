#!/usr/bin/env bash
set -euo pipefail

# Regenerate every generated artifact in this repository, in place.
#
# Claude Skill Directory is a single self-contained repository: the skill
# archive lives in ./skills and all generated outputs (registry shards,
# registry summary, search/signal indexes, category artifacts) are written
# back into this same working tree. Nothing is synced from or to another
# repository.
#
# Usage:
#   scripts/regenerate.sh [--no-validate]
#
#   --no-validate   Rebuild artifacts but skip the validator gate. Use only
#                   for local iteration; CI always runs the full sequence.
#
# Requires: python3 with requirements.txt installed.

usage() {
  sed -n '4,18p' "$0" | sed 's/^# \{0,1\}//'
}

validate=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-validate) validate=0; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage >&2; exit 2;;
  esac
done

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
security_report_path=""

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*"
}

start_group() {
  local label="$1"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    printf '::group::%s\n' "$label"
  fi
  log "START: $label"
}

end_group() {
  local label="$1"
  local status="$2"
  local elapsed="$3"
  log "END: $label status=$status elapsed=${elapsed}s"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    printf '::endgroup::\n'
  fi
}

run_step() {
  local label="$1"
  shift
  local started="$SECONDS"
  local status
  start_group "$label"
  set +e
  "$@"
  status="$?"
  set -e
  end_group "$label" "$status" "$((SECONDS - started))"
  return "$status"
}

cleanup() {
  if [[ -n "$security_report_path" && -f "$security_report_path" ]]; then
    rm -f "$security_report_path"
  fi
}
trap cleanup EXIT

run_step "Rebuild registry shards and category indexes" python "$repo_dir/scripts/rebuild_registry.py" \
  --skills-dir "$repo_dir/skills" \
  --registry "$repo_dir/registry.json" \
  --categories-dir "$repo_dir/docs/categories" \
  --compat-manifest-pointer

run_step "Build registry summary" python "$repo_dir/scripts/build_registry_summary.py" \
  --registry "$repo_dir/registry.json" \
  --plugins "$repo_dir/sources/plugins.json" \
  --output "$repo_dir/registry_summary.json"

security_report_path="$(mktemp)"
mkdir -p "$repo_dir/docs"
run_step "Generate required security evidence" python "$repo_dir/scripts/security_scanner.py" \
  "$repo_dir/skills" \
  --quiet \
  --progress-interval 10000 \
  --report-only \
  --output "$security_report_path"

run_step "Build search and signal indexes" python "$repo_dir/scripts/build_search_index.py" \
  --skills-dir "$repo_dir/skills" \
  --output "$repo_dir/docs" \
  --security-report "$security_report_path"
rm -f "$security_report_path"
security_report_path=""

if [[ "$validate" -eq 1 ]]; then
  run_step "Check published categories are canonical" python "$repo_dir/scripts/check_canonical_categories.py" \
    --skills-dir "$repo_dir/skills" \
    --registry-shards "$repo_dir/registry-shards" \
    --docs-dir "$repo_dir/docs"

  run_step "Check generated artifact sizes" python "$repo_dir/scripts/check_generated_file_sizes.py" \
    --root "$repo_dir" \
    --include registry.json \
    --include registry-shards \
    --include docs

  run_step "Check category artifacts" python "$repo_dir/scripts/check_category_artifacts.py" \
    --categories-dir "$repo_dir/docs/categories"

  run_step "Validate static artifact API v1" python "$repo_dir/scripts/check_artifact_api.py" \
    --root "$repo_dir" \
    --docs-dir "$repo_dir/docs"

  run_step "Generate third-party notices (advisory full-archive metadata scan)" python "$repo_dir/scripts/check_metadata_compliance.py" \
    --skills-dir "$repo_dir/skills" \
    --metadata-schema "$repo_dir/schema/metadata.schema.json" \
    --notices "$repo_dir/THIRD_PARTY_NOTICES.md" \
    --report-only
fi

log "Done."
