# Migration Playwright Specs

Specs in this directory intentionally exercise migration seams that require historical or pre-cleaned document data. They may seed persisted Actors or Items with Foundry document APIs so migrations can be verified against data shapes that no longer have a normal UI creation path.

Keep this exception local to migration coverage. Normal Playwright specs should create Actors and Items through the UI helpers in `tools/playwright/ui/` and reserve direct APIs for users, permissions, settings, modules, and read-only assertions.
