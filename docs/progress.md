# Canopy Create — Progress and Current Work

Append new sessions at the top. Do not overwrite history.

---

## 2026-04-14 — Phases 3–7 complete: full production loop is live

### Phase 3 — Richer intake forms
- Expanded all four V1 request forms with the full field set:
  - Design project: audience, format (print/digital/both), quantity, delivery date
  - Website update: priority, desired go-live date
  - Managed newsletter: audience segment, subject line idea, featured events
  - Social request: tone, CTA, desired post date
- Updated Zod validators for all new fields
- Updated `buildRequestDetails` in `app/requests/actions.ts` to pass all new fields

### Phase 4 — Project production sheet
- Rewrote project detail page as a proper production sheet:
  - Project status controls (active / completed / archived)
  - Milestone checklist with progress bar (X / Y complete)
  - Deliverable list with inline status selects
  - Add milestone and add deliverable forms
  - Link back to origin request

### Phase 5 — Item collaboration
- Built full deliverable detail page (`app/items/[itemId]/page.tsx`):
  - Versioned proof uploads (file + version label + notes)
  - Signed URL download for each version file
  - Approval actions: Approved / Approved with changes / Changes requested
  - Approval history displayed per version
  - Comments thread with author avatar initials + timestamp
- New server actions in `app/items/actions.ts`:
  - `uploadVersionAction` — uploads to Supabase Storage, records `create_item_versions`
  - `submitApprovalAction` — records decision in `create_approvals`
  - `addCommentAction` — records in `create_item_comments`
- Deliverable titles on project page now link through to item detail

### Phase 6 — Permissions
- Created `lib/create-roles.ts` with role model and permission gates:
  - `canManageProjects`: owner, internal_manager
  - `canTriageRequests`: owner, internal_manager
  - `canUpdateDeliverables`: owner, internal_manager, designer, developer
  - `isInternalRole`: all internal roles
  - `isClientRole`: client_admin, client_staff
- Added `getServerActionAccess(workspaceId)` to `lib/server-auth.ts`
- Gated all server actions: convert, project status, triage, item status, milestone toggle
- Gated all UI controls: convert button, status buttons, add forms, milestone toggle, ItemStatusSelect, upload version button
- Clients see read-only views of milestones and deliverable status; approval and comments remain open to all

### Phase 7 — File uploads
- Request attachments: upload action, signed URL generation, delete action, `RequestAttachments` component in request detail sidebar
- Item version file upload: `uploadVersionAction` in `app/items/actions.ts`, upload form in `ItemVersions` component
- Storage path convention: `create/{workspaceId}/requests/{requestId}/...` and `create/{workspaceId}/items/{itemId}/versions/...`
- Reuses `originals` bucket from the shared Supabase project

### Plane integration (built during Phase 4/5)
- Created `lib/plane-client.ts`:
  - `createPlaneProject`: fired on request → project conversion
  - `createPlaneIssue`: fired on deliverable add
  - `listPlaneProjectStates`, `updatePlaneIssueState`: available for future sync
- `plane_project_id` stored on `create_projects`
- `plane_issue_id` stored on `create_items`
- Fire-and-log pattern — Plane failures never block school users

### Dashboard rewrite
- Replaced hero + stat cards with actionable content:
  - "Needs your attention" amber section for `client_review` requests
  - Open requests list
  - Active projects list
  - Useful empty state with CTA

### Auth fixes
- Added `/login` page for direct-access (non-Portal) flows
- Fixed workspace param routing — `router.replace()` instead of `window.history.replaceState()` so server components re-render
- Removed unnecessary loading spinner from product shell

### Verification
- `npx tsc --noEmit` passes clean

---

## 2026-04-14 — Core request, project, and milestone workflow is live in repo

- Restored and finalized the root app/runtime setup
- Brought the repo from scaffold state into a working first product slice:
  - overview dashboard, requests directory, projects directory
  - request detail, project detail
- Implemented the Create domain layer: requests, projects, items, milestones
- Added typed request-family / request-type definitions and zod validators
- Built the V1 intake flow: type picker + four specialized forms
- Implemented request conversion: request → project, stores `converted_project_id`
- Implemented project workflow basics: status controls, milestone creation, milestone complete/reopen
- Added active/all filtering for projects and requests

### Verification
- `npm run build` passed

---

## 2026-04-13 — Repo aligned from generic scaffold to Canopy Create

- Replaced generic scaffold docs with product-specific Canopy Create docs
- Added first product-definition document at `docs/PRD.md`
- Updated package identity from `canopy-product-starter` to `canopy-create`

---

## 2026-04-06 — Starter scaffold imported

- Repo created from the canonical Canopy product starter
- Included handoff exchange, server-backed session, workspace switcher, and placeholder dashboard
