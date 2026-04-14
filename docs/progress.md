# Canopy Create — Progress and Current Work

Append new sessions at the top. Do not overwrite history.

---

## 2026-04-14 — Core request, project, and milestone workflow is live in repo

- Restored and finalized the root app/runtime setup:
  - `package.json`
  - Tailwind/PostCSS wiring
  - global loading and error boundaries
- Brought the repo from scaffold state into a working first product slice:
  - overview dashboard
  - requests directory
  - projects directory
  - request detail
  - project detail
- Implemented the current Create domain layer:
  - `create_requests`
  - `create_projects`
  - `create_items`
  - `create_milestones`
  - request `details` JSON support
- Added typed request-family / request-type definitions and zod validators
- Built the V1 intake flow:
  - request type picker
  - design project form
  - website update form
  - managed newsletter form
  - social request form
- Implemented request conversion:
  - request detail shows the brief
  - request converts into a project
  - request stores `converted_project_id`
- Implemented project workflow basics:
  - project status controls
  - milestone creation
  - milestone complete / reopen flow
- Added active/all filtering for projects and requests so closed work does not clutter primary views
- Initialized the git repo, pushed `main` to GitHub, and cleaned the stale vendored UI tarball

### Verification
- `npm run build` passed in `canopy-create`

### Current Gaps
- attachments and source-document workflow are not complete yet
- deliverables, revisions, and approvals are not built yet
- PhotoVault asset linking is not wired yet
- Portal-side Create launch enablement in `canopy-platform` is still pending

## 2026-04-13 — Repo aligned from generic scaffold to Canopy Create

- Replaced the generic scaffold README and agent guide with product-specific Canopy Create docs
- Added the first product-definition document at `docs/PRD.md`
- Updated package identity from `canopy-product-starter` to `canopy-create`
- Updated the dashboard stub and added a basic settings page so the repo no longer reads like an unedited starter
- Captured the current product direction:
  - client request intake
  - internal production workflow
  - proofs, revisions, approvals, and delivery
  - recurring source-document workflows such as catalogs
  - future freelancer path, but not in V1

### Verification
- `npm run build` pending after doc + starter alignment changes

---

## 2026-04-06 — Starter scaffold imported

- Repo was created from the canonical Canopy product starter
- Included handoff exchange, server-backed session, workspace switcher, and placeholder dashboard
