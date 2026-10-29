#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Create the signal tag on the current commit through the GitLab tags API.
#
# Environment:
#   CI_API_V4_URL    GitLab API base URL (required)
#   CI_COMMIT_SHA    commit to tag (required)
#   CI_PROJECT_ID    numeric GitLab project id (required)
#   SIGNAL_TAG_NAME  signal tag name (default: signal)
#   CHOOM_BOT_API    token with permission to create repository tags (required)
#   TAG_API_TOKEN    optional override for CHOOM_BOT_API

create_tag() {
	local api_url
	local project_id
	local commit_sha
	local token
	local tag_name
	local body_file
	local http_code

	api_url="${1}"
	project_id="${2}"
	commit_sha="${3}"
	token="${4}"
	tag_name="${5}"
	body_file="$(mktemp)"

	http_code="$(
		curl \
			--silent \
			--show-error \
			--output "${body_file}" \
			--write-out '%{http_code}' \
			--request POST \
			--header "PRIVATE-TOKEN: ${token}" \
			--form "tag_name=${tag_name}" \
			--form "ref=${commit_sha}" \
			"${api_url}/projects/${project_id}/repository/tags"
	)"

	if [[ "${http_code}" != "201" ]]; then
		printf 'failed to create tag %s (HTTP %s)\n' "${tag_name}" "${http_code}" >&2
		cat "${body_file}" >&2
		rm -f "${body_file}"
		return 1
	fi

	rm -f "${body_file}"
}

main() {
	local api_url
	local commit_sha
	local project_id
	local token
	local tag_name

	api_url="${CI_API_V4_URL:?CI_API_V4_URL must be set}"
	commit_sha="${CI_COMMIT_SHA:?CI_COMMIT_SHA must be set}"
	project_id="${CI_PROJECT_ID:?CI_PROJECT_ID must be set}"
	token="${TAG_API_TOKEN:-${CHOOM_BOT_API:?CHOOM_BOT_API must be set}}"
	tag_name="${SIGNAL_TAG_NAME:-signal}"

	create_tag "${api_url}" "${project_id}" "${commit_sha}" "${token}" "${tag_name}"
	printf 'created signal tag %s for %s\n' "${tag_name}" "${commit_sha}"
}

main
