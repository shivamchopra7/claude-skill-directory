import json
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def read_repo_file(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def read_workflow(path: str) -> dict:
    return yaml.safe_load(read_repo_file(path))


def workflow_step(workflow_path: str, job_name: str, step_name: str) -> dict:
    workflow = read_workflow(workflow_path)
    return next(
        step for step in workflow["jobs"][job_name]["steps"] if step.get("name") == step_name
    )


def test_pages_app_keeps_full_index_behind_explicit_action():
    app_js = read_repo_file("docs/js/app.js")
    artifact_api_js = read_repo_file("docs/js/artifact-api.js")
    index_html = read_repo_file("docs/index.html")

    assert "INDEX_URL: 'search-index-lite.json'" in app_js
    assert "LEGACY_INDEX_URL: 'search-index.json'" in app_js
    assert "function normalizeSearchIndex" in artifact_api_js
    assert "function loadSearchIndex" in app_js
    assert "function activateFullSearch" in app_js
    assert 'id="search-all-btn"' in index_html
    assert index_html.index('src="js/artifact-api.js"') < index_html.index('src="js/app.js"')
    assert "in highlighted index" in app_js


def test_readme_links_static_artifact_api_contract():
    readme = read_repo_file("README.md")

    assert "[docs/artifact-api-contract.md](docs/artifact-api-contract.md)" in readme


def test_static_artifact_api_contract_names_public_entrypoints():
    contract = read_repo_file("docs/artifact-api-contract.md")
    expected_paths = [
        "search-index-lite.json",
        "search-index.json",
        "search-index-manifest.json",
        "search-shards/part-000.json",
        "featured.json",
        "plugins.json",
        "stats.json",
        "quality-index.json",
        "quality-index-manifest.json",
        "quality-shards/part-000.json",
        "security-index.json",
        "security-index-manifest.json",
        "security-shards/part-000.json",
        "ranking-index.json",
        "ranking-index-manifest.json",
        "ranking-shards/part-000.json",
        "categories/index.json",
        "categories/<category>.json",
        "categories/<category>/manifest.json",
        "categories/<category>/part-000.json",
        "registry_summary.json",
        "registry.json",
        "registry-manifest.json",
        "registry-shards/00.json",
    ]

    for path in expected_paths:
        assert path in contract


def test_static_artifact_api_contract_covers_pointer_and_manifest_fields():
    contract = read_repo_file("docs/artifact-api-contract.md")
    expected_terms = [
        "deprecated_full_payload: true",
        "manifest",
        "replacement",
        "compat_since",
        "compat_until",
        "schema_version",
        "sha256",
        "gzip_path",
        "shards",
        "parts",
        "records",
        "skills",
        "static-artifact-api-v1",
        "static-artifact-api-v2",
        "Same-set Count Groups",
    ]

    for term in expected_terms:
        assert term in contract


def test_pages_leaderboard_uses_bounded_sources():
    app_js = read_repo_file("docs/js/app.js")
    render_js = read_repo_file("docs/js/app-render.js")

    assert "fullIndex: null" in app_js
    assert "async function loadCategoryLeaderboardSkills" in app_js
    assert "async function showLeaderboard" in render_js
    assert "await loadCategoryLeaderboardSkills(categoryFilter)" in render_js
    assert "state.featured.map(normalizeSkillRecord)" in render_js


def test_pages_reader_rejects_unknown_artifact_shapes_without_empty_fallbacks():
    artifact_api_js = read_repo_file("docs/js/artifact-api.js")
    app_js = read_repo_file("docs/js/app.js")
    full_loader = app_js[
        app_js.index("async function loadFullSearchIndex") : app_js.index(
            "async function getFilterBaseSkills"
        )
    ]

    assert "requireExactFields" in artifact_api_js
    assert "validateSearchPointer" in full_loader
    assert "validateSearchManifest" in full_loader
    assert "validateSearchShardEntry" in full_loader
    assert "validateSearchShardPayload" in full_loader
    assert "|| []" not in full_loader
    assert "manifest.v || pointer.v" not in full_loader


def test_regenerate_runs_generated_size_guard_after_rebuild():
    script = read_repo_file("scripts/regenerate.sh")
    body = script[script.index('run_step "Rebuild registry shards') :]

    registry_pos = body.index("scripts/rebuild_registry.py")
    summary_pos = body.index("scripts/build_registry_summary.py")
    security_pos = body.index("scripts/security_scanner.py")
    search_pos = body.index("scripts/build_search_index.py")
    cleanup_pos = body.index('rm -f "$security_report_path"')
    canonical_pos = body.index("scripts/check_canonical_categories.py")
    guard_pos = body.index("scripts/check_generated_file_sizes.py")
    category_guard_pos = body.index("scripts/check_category_artifacts.py")
    artifact_api_pos = body.index("scripts/check_artifact_api.py")

    assert (
        artifact_api_pos
        > category_guard_pos
        > guard_pos
        > canonical_pos
        > cleanup_pos
        > search_pos
        > security_pos
        > summary_pos
        > registry_pos
    )
    assert 'security_report_path="$(mktemp)"' in script
    assert '--output "$security_report_path"' in script
    assert '--security-report "$security_report_path"' in script
    assert "--progress-interval 10000" in script
    assert '--output "$repo_dir/docs/security-report.json"' not in script
    assert "--report-only" in body[security_pos:search_pos]
    assert "--allow-missing-security-evidence" not in script
    assert "--compat-manifest-pointer" in script
    assert "--include registry.json" in script
    assert "--include registry-shards" in script
    assert "--include docs" in script
    assert "--categories-dir" in script
    assert "--registry-shards" in script
    assert '--root "$repo_dir"' in script
    assert '--docs-dir "$repo_dir/docs"' in script


def test_regenerate_has_observable_steps_and_operates_in_place():
    script = read_repo_file("scripts/regenerate.sh")

    expected_steps = [
        "Rebuild registry shards and category indexes",
        "Build registry summary",
        "Generate required security evidence",
        "Build search and signal indexes",
        "Check published categories are canonical",
        "Check generated artifact sizes",
        "Check category artifacts",
        "Validate static artifact API v1",
        "Generate third-party notices (advisory full-archive metadata scan)",
    ]
    for label in expected_steps:
        assert f'run_step "{label}"' in script

    assert script.startswith("#!/usr/bin/env bash\nset -euo pipefail\n")
    assert "::group::%s" in script
    assert "elapsed=${elapsed}s" in script
    assert "Usage:" in script

    # Single-repo: no cross-repo mirroring remains.
    assert "rsync" not in script
    assert "--core" not in script
    assert "--data " not in script
    assert "--main" not in script
    assert "sync_core_to_main" not in script
    assert "sync_data_to_main" not in script


def test_regenerate_metadata_compliance_is_advisory_for_historical_notices():
    script = read_repo_file("scripts/regenerate.sh")
    notices_block = script[script.index("Generate third-party notices") :]

    assert "scripts/check_metadata_compliance.py" in notices_block
    assert '--notices "$repo_dir/THIRD_PARTY_NOTICES.md"' in notices_block
    assert "--report-only" in notices_block
    assert "--strict" not in notices_block


def test_deploy_pages_is_manually_dispatchable_and_not_docs_only():
    workflow_text = read_repo_file(".github/workflows/deploy-pages.yml")
    workflow = read_workflow(".github/workflows/deploy-pages.yml")
    triggers = workflow.get(True) or workflow.get("on")

    assert "workflow_dispatch" in triggers
    assert "paths:" not in workflow_text
    assert "paths-ignore" in triggers["push"]
    assert triggers["push"]["branches"] == ["main"]


def test_metadata_compliance_keeps_readme_attribution_heading_gate():
    workflow_text = read_repo_file(".github/workflows/metadata-compliance.yml")
    readme = read_repo_file("README.md")

    assert 'grep -q "Third-Party License & Attribution" README.md' in workflow_text
    assert "Third-Party License & Attribution" in readme


def test_repository_has_no_split_pipeline_wiring():
    removed = [
        ".github/workflows/publish-from-core.yml",
        ".github/workflows/sync-data.yml",
        ".github/ISSUE_TEMPLATE/mirror-artifact.yml",
        "scripts/sync_main_repo.sh",
        "scripts/build_publish_commit_message.py",
        "scripts/build_publish_readiness_report.py",
        "provenance/merge-source.json",
        "provenance/publish-status.json",
        "SCHEME2_SPLIT.md",
    ]
    for path in removed:
        assert not (ROOT / path).exists(), f"{path} still exists"

    for workflow_path in sorted((ROOT / ".github").rglob("*.yml")):
        text = workflow_path.read_text(encoding="utf-8")
        assert "claude-skill-registry-core" not in text, workflow_path
        assert "claude-skill-registry-data" not in text, workflow_path
        assert "publish_from_core" not in text, workflow_path
        assert "core_sha" not in text, workflow_path
        assert "data_sha" not in text, workflow_path


def test_repository_routing_files_point_at_the_single_repo():
    issue_config = read_repo_file(".github/ISSUE_TEMPLATE/config.yml")
    pull_request_template = read_repo_file(".github/PULL_REQUEST_TEMPLATE.md")

    assert "https://shivamchopra7.github.io/claude-skill-directory/" in issue_config
    assert "github.com/shivamchopra7/claude-skill-directory" in issue_config
    assert "scripts/regenerate.sh" in pull_request_template
    assert "majiayu000" not in issue_config
    assert "majiayu000" not in pull_request_template


def test_root_rebuild_commands_are_executable(tmp_path):
    skill_dir = tmp_path / "skills" / "development" / "demo"
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text("# Demo\n\nGenerated fixture.\n", encoding="utf-8")
    (skill_dir / "metadata.json").write_text(
        json.dumps({"name": "demo", "repo": "owner/demo", "path": "development/demo/SKILL.md", "branch": "main", "category": "development"}),
        encoding="utf-8",
    )
    registry = tmp_path / "registry.json"
    manifest = tmp_path / "registry-manifest.json"
    shards = tmp_path / "registry-shards"
    summary = tmp_path / "registry_summary.json"
    subprocess.run(
        [
            sys.executable, str(ROOT / "scripts/rebuild_registry.py"),
            "--skills-dir", str(tmp_path / "skills"), "--registry", str(registry),
            "--manifest", str(manifest), "--shards-dir", str(shards),
            "--skip-categories", "--compat-manifest-pointer",
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        [
            sys.executable, str(ROOT / "scripts/build_registry_summary.py"),
            "--registry", str(registry), "--plugins", str(ROOT / "sources/plugins.json"),
            "--output", str(summary),
        ],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    assert json.loads(registry.read_text())["manifest"] == "registry-manifest.json"
    assert json.loads(manifest.read_text())["total_count"] == 1
    assert json.loads(summary.read_text())["total_count"] == 1
