#!/usr/bin/env bash
# Creates or updates every label in .github/labels.yml (idempotent).
# Requires the GitHub CLI (`gh`) logged in with access to the repo.
# Usage: scripts/sync-labels.sh [owner/repo]
set -euo pipefail

cd "$(dirname "$0")/.."
repo_args=()
if [[ $# -ge 1 ]]; then repo_args=(--repo "$1"); fi

command -v gh >/dev/null || { echo "gh CLI not found" >&2; exit 1; }

# Each line looks like: - { name: "x", color: "abc123", description: "text" }
while IFS= read -r line; do
  [[ "$line" =~ ^-\ \{ ]] || continue
  name=$(sed -E 's/.*name: "([^"]*)".*/\1/' <<<"$line")
  color=$(sed -E 's/.*color: "([^"]*)".*/\1/' <<<"$line")
  desc=$(sed -E 's/.*description: "([^"]*)".*/\1/' <<<"$line")
  gh label create "$name" --color "$color" --description "$desc" --force ${repo_args[@]+"${repo_args[@]}"}
done < .github/labels.yml
