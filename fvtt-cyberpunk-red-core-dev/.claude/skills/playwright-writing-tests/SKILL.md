---
name: playwright-writing-tests
description: "Write Playwright tests for this repo using the current harness: import test primitives from @playwright/test, use the shared helpers under tools/playwright, drive user-facing behavior through the real UI, prove visible outcomes, and group sheet/app coverage with test.step(...) plus fresh-render reopen guards after mutations."
---

# Writing Playwright tests

This skill is the repo-wide process for writing Playwright tests here.

It is about **how** we write Playwright coverage in this repo, not when to choose
Playwright over some other test layer.

## Current harness surfaces

Use the current Playwright harness entrypoints rather than stale pre-refactor
paths.

- Import `test` and `expect` from `@playwright/test`.
- Import shared UI-driving helpers from `tools/playwright/ui/index.mjs`.
- Import world/session helpers such as `gotoReadyWorld` and `openPlayerPage`
  from `tools/playwright/session/world.mjs`.
- Treat `tests/playwright/fixtures.mjs` as a thin convenience re-export, not as
  the sole or complete test facade.

When you name commands for the dev, use the current harness commands:

- `npm run test:playwright`
- `npm run playwright:serve`

Do not suggest the pre-refactor command names.

## Core model

Playwright tests in this repo are built around these rules:

- Drive **user-facing system and Foundry behavior through the real UI**.
- Prove **what the user visibly sees** after taking the action.
- Reuse and expand the shared helper layer early.
- Group coverage by concrete sheet/app surface when practical, but keep each
  checked behavior explicit inside that grouped test.
- Treat fresh render after mutation as a first-class guard against latent
  breakage.

## Helper model

Prefer creating shared helpers early.

Shared helpers should be:

- assertion-free
- intentful
- named for the UI path they drive
- general enough to reuse across specs or browser-driving agent flows

Shared UI-driving helpers should use `ViaUI` naming where the real UI path is
part of the contract.

Examples:

- `createDocumentViaUI`
- `reopenActorSheetViaUI`
- `deleteDocumentViaUI`
- `openSidebarTab`

Shared helpers should drive actions and wait for meaningful state transitions,
but **must not make assertions**. The spec owns assertions.

## Proactive helper decomposition

Keep `tools/playwright/ui/index.mjs` as the stable public UI-helper facade, but
proactively move implementation behind it into concern-specific modules under:

- `tools/playwright/ui/*.mjs`

Split helper implementations by **interaction domain**, not by whichever spec
first needed them.

Good domain examples:

- document lifecycle
- sheet/app navigation
- dialogs
- drag/drop
- directory/sidebar flows
- world/admin setup

Session and world-lifecycle helpers belong under the session/setup side of the
harness, such as:

- `tools/playwright/session/*.mjs`
- `tools/playwright/setup/*.mjs`

When working on Playwright tests, proactively decompose old helpers as you touch
them instead of letting a facade module keep growing.

Important:

- keep `tools/playwright/ui/index.mjs` as the import surface for shared UI
  helpers
- re-export shared UI helpers from that facade
- when doing helper decomposition, make that decomposition its **own commit**,
  separate from the new test/spec commit

## UI versus API rule

Use the real UI for anything user-facing that the system or Foundry surface
actually does.

That includes:

- sheet interactions
- app interactions
- Actor creation
- Actor deletion
- Item creation
- Item deletion
- document/surface flows the user performs directly

This repo has overrides and side effects that can happen only on the real UI
path. Do not bypass them for convenience.

Use the Foundry API only for admin/global scaffolding.

Examples of acceptable API/setup work:

- user creation
- auth/session setup
- game settings
- permissions / ownership
- world bootstrapping
- similar non-sheet, non-app setup plumbing
- enabling modules

If a user can normally do the thing through the UI and that behavior is part of
what we care about, prefer the UI path.

## Assertions and proof

Primary proof should be what the user **visibly sees**.

Prefer assertions on rendered, user-facing output such as:

- visible text
- labels
- controls
- dialog content
- chat-card content
- visible rows / fields / sections

DOM structure, classes, and `data-*` attributes are mainly for locating the
right element, not for replacing user-facing proof.

API/state reads are allowed only as **supporting evidence** for persistence or
side effects. They do not replace visible assertions when visible proof exists.

## Screenshots

Do not add new screenshots for now.

Existing screenshot helpers are historical smoke-test artifacts, not the primary
model for new Playwright test authoring.

## Wait strategy

Always wait on meaningful rendered or persisted state tied to the behavior.

Use helper-driven waits for things like:

- document creation completing
- a sheet/app rendering
- a field update persisting
- a dialog appearing or closing
- a fresh render succeeding after reopen

Do not use sleep-style timing hacks when a real rendered or persisted condition
can be waited on.

## Setup discipline

Keep setup minimal and intentional.

Create only the state needed for the behavior under test, preferably through
shared UI helpers.

Use the current harness flows deliberately:

- for GM coverage, use Playwright's normal `page` plus
  `await gotoReadyWorld(page)` in `beforeEach`, then alias `page` to `game` in
  the test body when that improves readability
- for player-facing behavior, use `openPlayerPage(browser, baseURL)` from
  `tools/playwright/session/world.mjs`
- remember that the player-page flow does **not** reset the world; set only the
  state you need and assert relative before/after changes

Do not treat the GM and player flows as interchangeable. Their world/session
behavior is part of the contract.

## Grouped test model

For runtime reasons, default to grouping coverage by concrete sheet/app surface.

That means the normal pattern is:

- one top-level Playwright `test(...)` per sheet/app surface
- many named `test.step(...)` subtests inside it

This keeps reporting and runtime practical while still letting the grouped test
read like a behavior checklist.

### Exception rule

Allow more than one top-level test for one surface only when there is a material
boundary, such as:

- GM ready-world coverage versus explicit player-page coverage
- materially different setup or world scaffolding
- surface modes that behave like separate applications
- poison-prone branches that would make one grouped test brittle or meaningless

## Subtest rules inside grouped tests

Every checked behavior inside a grouped surface test should be a named
`test.step(...)`.

Order subtests like this:

1. safer / read-only checks first
2. ordinary mutating flows next
3. riskiest or destructive flows last

Each step should explicitly re-establish its own immediate UI preconditions
instead of assuming the previous step left the surface in the right state.

Prefer shared helpers for reacquiring that state.

Examples:

- reopening the sheet/app
- activating the needed tab
- reopening a dialog
- reselecting the relevant mode

## Hard reopen rule for mutating subtests

This is a hard rule.

If a subtest mutates sheet/app-backed document state, that subtest must:

1. perform the change
2. close the surface
3. reopen the surface
4. prove the result on the fresh render

Do not keep one stale render alive across many mutations and only reopen at the
end.

Why this matters here:

- a misconfiguration can leave the current sheet still interactable
- the breakage often only appears on fresh render
- closing and reopening after mutation is how we catch those latent failures

Read-only subtests do **not** need close/reopen.

## Soft failures versus hard stop

Inside grouped tests:

- use soft assertions for ordinary failures so one failed check does not hide
  later subtests
- but stop the grouped test if a mutating subtest cannot successfully
  close/reopen or otherwise reacquire a sane fresh render

In other words:

- normal failed behavior proof can stay soft
- poisoned surface recovery is not optional; if the surface cannot be safely
  reacquired, stop

## Selector guidance

Prefer stable selectors that reflect the real surface contract.

Good selectors are usually anchored on meaningful things such as:

- stable ids
- names
- roles / labels
- existing meaningful `data-*` hooks
- a concrete sheet/app root plus a meaningful child control

Avoid selectors that depend on incidental DOM trivia such as:

- positional wrappers
- decorative nesting
- fragile structural chains that do not represent the UI contract

## Test-only hooks

Avoid adding test-only hooks by default.

Prefer existing user-surface selectors and shared helper patterns first.

If a dedicated hook seems necessary:

- do not block immediately
- keep going until that need becomes the actual blocker
- then ask the dev with context about:
  - the test being written
  - what selector/problem is blocking progress
  - what hook seems needed
  - why the current surface is not a reasonable stable path

## Comment discipline

Do not add comments by default.

Only comment genuinely non-obvious Foundry/Playwright quirks that the code
cannot realistically make self-explanatory. If a block needs a long
explanation, prefer rewriting it more clearly.

## ESLint rule discipline

Do not disable the Playwright ESLint rule(s) used by this repo unless the dev
explicitly agrees.

If a Playwright test seems to require disabling one:

- keep going until that lint rule is the actual blocker
- then ask the dev before changing it
- explain what the test is doing
- explain which rule seems to be in the way
- explain why the current helper/process model does not satisfy that rule
- do not commit a lint-disable without that check-in

## Recommended shape

Use this grouped-surface recipe by default:

1. import `test` and `expect` from `@playwright/test`
2. import shared UI helpers from `tools/playwright/ui/index.mjs`
3. import world/session helpers from `tools/playwright/session/world.mjs` when
   needed
4. create/open the surface through shared helpers
5. organize sub-behaviors as named `test.step(...)`
6. order steps from safest to riskiest
7. for each read-only step, drive the UI path and prove visible output
8. for each mutating step, drive the UI path, close, reopen, and then prove the
   result on the fresh render
9. use soft assertions for ordinary failed checks
10. abort when a mutating step cannot reacquire a sane surface after reopen

## Examples

Use the existing suite as pattern references.

### Shared harness entrypoints

- `tools/playwright/ui/index.mjs`
- `tools/playwright/session/world.mjs`
- `tests/playwright/setup.mjs`

These show the current shared helper surfaces, GM/player session setup model,
world reset behavior, and existing helper patterns.

### UI-first document lifecycle

- `tests/playwright/items/creation.spec.mjs`
- `tests/playwright/actors/creation.spec.mjs`

These show document creation driven through the Foundry UI rather than direct
API creation.

### Fresh-render guard after mutation

- `tests/playwright/items/drop.spec.mjs`

This is the core pattern for latent breakage: perform a UI mutation, then close
and reopen to prove a fresh render still succeeds.

### Visible proof over internal proof

- `tests/playwright/items/document-browser.spec.mjs`
- `tests/playwright/items/document-browser-shop.spec.mjs`
- `tests/playwright/rolls/luck.spec.mjs`

These show actions driven through the UI with assertions aimed at visible
browser output, dialog behavior, chat output, or other user-facing results.

### Supporting state reads without replacing visible proof

- `tests/playwright/items/source-sheet.spec.mjs`
- `tests/playwright/items/weapon-upgrades.spec.mjs`

These show the acceptable pattern where state reads help confirm persistence or
side effects, but do not replace the visible/user-facing assertion model.

## Non-examples

Avoid these patterns:

- telling the dev to run `npm run test:browser` or `npm run browser:serve`
- treating `tests/playwright/fixtures.mjs` as if it exports the full harness
- reaching into deep helper modules when `tools/playwright/ui/index.mjs` or
  `tools/playwright/session/world.mjs` already expose what you need
- adding assertions to shared helpers
- using API calls for user-facing sheet/app/document behavior just because they
  are shorter
- piling every branch of a surface into one uninterrupted stale render
- mutating repeatedly and reopening only once at the end
- adding new screenshots as proof for new tests
- adding test-only hooks without first exhausting reasonable surface selectors
  and helper patterns
