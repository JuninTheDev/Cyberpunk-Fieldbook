---
name: trigger-pipeline
description: Trigger or retry GitLab pipelines and jobs with `glab`, especially when `fvtt-cyberpunk-red-core` needs a fresh pipeline to pick up a change that landed in `cprc-cicd`. Use when asked to rerun a pipeline or job, or when a CI fix landed in another repo and the consumer repo needs a new MR pipeline without browser automation or dummy commits.
---

# Triggering GitLab pipelines

Use `glab`, not browser automation, HTML scraping, or empty "trigger pipeline"
commits.

## Start with auth

Check `glab` first:

```bash
glab auth status
```

- If `glab` is not authenticated, stop and ask the dev how to proceed.
- Do **not** work around missing auth by clicking the GitLab UI with Playwright.
- Do **not** create an empty commit just to make GitLab spawn a pipeline.

## Choose the right action

### Re-run one job

Use `glab ci retry` only when the **existing pipeline definition is still the
right one** and you just need to re-run a flaky or transiently failed job.

```bash
glab ci retry <job-id-or-name> -R <group/project>
```

### Create a fresh pipeline

Use `glab ci run` when the branch head changed or the pipeline config changed.
That includes indirect config changes, such as `fvtt-cyberpunk-red-core`
including `cyberpunk-red-team/cprc-cicd` at `ref: dev` and `cprc-cicd/dev`
receiving a new commit.

In that case, **do not retry the old pipeline/jobs**. Create a new pipeline so
GitLab re-evaluates the includes.

- Merge-request pipeline:

  ```bash
  glab ci run --mr -b "$(git branch --show-current)" \
    -R cyberpunk-red-team/fvtt-cyberpunk-red-core
  ```

- Branch pipeline:

  ```bash
  glab ci run -b "$(git branch --show-current)" -R <group/project>
  ```

Report the returned pipeline ID and URL.

## Core + cprc-cicd workflow

When a CI fix lands in `cyberpunk-red-team/cprc-cicd` and the core MR pipeline
must pick it up:

1. Push the `cprc-cicd` fix to the ref the core repo includes, normally `dev`.
2. Leave the core branch history alone.
3. In the core repo, create a **fresh MR pipeline** with `glab ci run --mr`.
4. Watch that new pipeline, not the already-failed one.

This is the normal way to re-run core after a shared-CI fix. **Do not use a
dummy commit as a trigger mechanism.**

## If a dummy trigger commit already exists

Remove it from history with **rebase**, not a revert commit.

- Rewrite the branch to drop the trigger commit.
- Force-push the cleaned history with lease.
- Add `-o ci.skip` to that cleanup push so the push itself does not create yet
  another unwanted pipeline.
- Then start the real MR pipeline with `glab ci run --mr`.

For any git push needed during cleanup, use the Claude key rather than the
developer's personal SSH auth:

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/claude_ed25519 -o IdentitiesOnly=yes' \
  git push --force-with-lease -o ci.skip origin HEAD
```

## Monitoring

Useful `glab` commands once the pipeline exists:

```bash
glab ci list -R <group/project>
glab ci status -R <group/project>
glab ci view <pipeline-id> -R <group/project>
glab ci trace <job-id-or-name> -R <group/project>
```

Use these instead of scraping the GitLab web UI.
