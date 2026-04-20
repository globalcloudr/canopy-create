# Canopy Create — Progress and Current Work

Append new sessions at the top. Do not overwrite history.

---

## 2026-04-20 — Design system alignment pass across all products

All Canopy products (photovault, canopy-stories, canopy-reach, canopy-create, canopy-community, canopy-platform portal) are now fully on the shared `@globalcloudr/canopy-ui` design system.

### Design tokens unified
- Replaced hardcoded hex colors with CSS design tokens (`--ink`, `--ink-2`, `--faint`, `--text-muted`, `--foreground`, `--surface`, `--surface-muted`, `--accent`, `--rule`, `--border`) across 50+ files
- Per-product accent classes: `.product-create` following the same pattern as other products

### Product switcher — Canopy Community added to all products
- Added `community_canopy` to Create's launcher products list
- Updated `/api/launcher-products` to include Community in entitled products
- "Canopy Community" now switchable from Create's in-app product dropdown
- Community marks itself "current" in the switcher

### Shared design components
- Create shell uses: `AppShellFrame`, `AppShellSidebar`, `AppShellContent`
- Sidebar uses: `AppSidebarPanel`, `AppSidebarSection`, `sidebarNavItemClass(active)` with `border-l-2` left-border indicators
- Workspace switcher via `AppWorkspaceSwitcher` matching all other products
- Core Canopy fonts (Plus Jakarta Sans, Maven Pro, Source Serif 4) owned by `@canopy/ui` via `canopyFontVariables`

### Verification
- `npm run build` passed
- Sidebar structure matches other products
- Product switching functional
- No regressions in request/project/delivery workflows

---

## 2026-04-19 — Shared shell frame and app font ownership moved into @canopy/ui

- Updated Create to `@canopy/ui` v0.1.10
- Replaced the repo-local outer shell frame with shared `@canopy/ui` primitives:
  - `AppShellFrame`
  - `AppShellSidebar`
  - `AppShellContent`
- Removed local Canopy app font loading from `app/layout.tsx`
- Create now imports `canopyFontVariables` from `@canopy/ui`, so the core app font stack is owned by the shared package

### Verification

- `npm run build` passed
- `package-lock.json` now resolves `@canopy/ui` to `vendor/canopy-ui-0.1.10.tgz`

## 2026-04-16 — Milestone upgrade, production reminders, proof viewer, scope-aware templates

### Milestone upgrade (Phases 1–4)

**Schema** (`supabase/migrations/20260415000000_milestone_upgrade_and_templates.sql`):
- Added to `create_milestones`: `due_date`, `assignee_id`, `description`, `visibility` (`all`/`internal`), `milestone_status` (`not_started`/`in_progress`/`completed`/`blocked`)
- Added to `create_projects`: `cycle_number`, `origin_project_id`
- New table `create_project_templates` for future per-workspace customization

**Types and data layer**:
- `lib/create-status.ts` — added `MilestoneStatus`, `MilestoneVisibility`
- `lib/create-types.ts` — expanded `Milestone`, `CreateProject`; added `CreateProjectTemplate`, `MilestoneDefinition`, `DeliverableDefinition`
- `lib/create-data.ts` — `createMilestonesBatch`, `updateMilestone` with full payload, `listMilestonesForProjects`
- `app/projects/actions.ts` — expanded `addMilestoneAction`, added `updateMilestoneAction`

**Template system** (`lib/create-templates.ts`):
- `DEFAULT_TEMPLATES` — four templates: Catalog Production (57-day, 10 milestones based on Julie Vo / MVLA Adult School schedule), Newsletter (14-day), Website (scope-driven, see below), General Design (23-day, today-forward)
- `resolveTemplate(workflowFamily, requestType, requestDetails)` — matches by family → request type → scope field in details
- `resolveStartDate(template, requestDetails)` — smart date anchoring:
  - Catalogs and newsletters: work backwards from client's delivery/send date so the last milestone lands on the target date
  - Website standard/redesign: work backwards from go-live date
  - Website quick fix + all short-form design (banners, flyers, etc.): today-forward
  - Fallback to today-forward if date is missing or too soon for the full template span
- `generateMilestonesFromTemplate(definitions, startDate)` — produces `CreateMilestonePayload[]`

**Auto-generation on conversion** (`app/requests/actions.ts`):
- On `convertRequestToProject`, resolves template + start date and calls `createMilestonesBatch`
- Milestone steps synced to Plane with "Timeline" label and due dates via `createPlaneIssuesBatch`
- Fire-and-forget — template failures never block conversion

**Timeline UI** (`app/_components/milestone-timeline.tsx`):
- Vertical timeline with status icons (○ / ◐ / ✓ / ✕), color coding, overdue indicators
- Progress bar ("8 of 15 steps complete")
- `canEdit` prop: inline status dropdowns + date pickers for internal users, read-only for school
- `app/_components/milestone-add-form.tsx` for inline add (internal only)
- Timeline tab added to both internal and school project views
- School view filters to `visibility: "all"` milestones only

---

### Plane enhancements

- `getWorkspaceName(workspaceId)` in `lib/create-data.ts` — resolves school name for Plane project description
- `app/requests/actions.ts` — embeds `"Client: {name} | {title} — Canopy Create"` in Plane project description
- `getOrCreatePlaneCustomer`, `linkCustomerToPlaneIssue` in `lib/plane-client.ts` — Business-tier Customers API, fire-and-forget (silently skips on Free tier)

---

### Email notifications (`lib/email-client.ts`, `lib/email-templates.ts`, `lib/create-notifications.ts`)

- Resend integration via `sendEmailSafe` (fire-and-log, never throws)
- HTML email templates with branded blue-gradient header: proof ready, file delivered, changes requested, catalog kickoff, newsletter content-start, newsletter deadline
- `notifyProofReady` — fires when item status changes to `in_review`
- `notifyDelivered` — fires when `markDeliveredAction` runs
- `notifyChangesRequested` — fires on `changes_requested` approval; sends to `RESEND_NOTIFY_INTERNAL_EMAIL`
- Env vars required: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_NOTIFY_INTERNAL_EMAIL`

---

### Production subscriptions + recurring reminders (Phase 11)

**Schema** (`supabase/migrations/20260416000001_production_subscriptions.sql`):
- `create_production_subscriptions` — per-workspace opt-in per cycle type (catalog_fall / catalog_winter_spring / catalog_summer / newsletter_monthly), configurable delivery month/day and kickoff lead days
- `create_reminder_log` — idempotent cron; UNIQUE(subscription_id, reminder_type, trigger_date) prevents duplicate sends

**Data layer** (`lib/create-subscriptions.ts`):
- `listWorkspaceSubscriptions`, `upsertSubscription`, `getAllEnabledSubscriptions`
- `hasReminderBeenSent`, `logReminderSent`
- `getCatalogKickoffDate` — calculates kickoff date as delivery_date − lead_days
- `CATALOG_DELIVERY_DEFAULTS`: Fall → August, Winter/Spring → November, Summer → May

**Cron job** (`app/api/cron/production-reminders/route.ts`):
- Daily at 09:00 via Vercel Cron (`vercel.json`)
- Authenticated via `Authorization: Bearer {CRON_SECRET}`
- Newsletter: fires `content_start` reminder on the 15th, `content_deadline` on the 25th
- Catalog: fires `kickoff` reminder on the computed kickoff date
- Env var required: `CRON_SECRET`

**Settings UI** (`app/settings/page.tsx`, `app/settings/subscription-settings.tsx`, `app/settings/actions.ts`):
- Toggle cards for each subscription type
- Catalog cards: delivery month, delivery day, lead-time selector (6–10 weeks); shows calculated kickoff date live
- Newsletter card: toggle only
- Settings nav link added to both `SchoolShell` and `ClientShell`

**Pre-fill flow**:
- Reminder emails carry `?type=&suggest_title=&suggest_delivery_date=` URL params
- `app/requests/new/page.tsx` and `client.tsx` read all three params
- `DesignProjectForm` pre-fills `deliveryDate`; `NewsletterBriefForm` pre-fills `targetSendDate`
- School can edit all pre-filled values before submitting

**"Start next cycle" button** (`app/_components/start-next-cycle-button.tsx`):
- Shown on completed/archived projects (internal view, `canManage` only)
- Links to pre-filled new request form with type + title

**Dashboard production calendar**:
- `app/page.tsx` — school dashboard shows "Production Calendar" widget when any subscription is enabled
- Lists upcoming kickoff dates for catalogs and next newsletter reminder date

---

### Website scope field

- Three website templates replacing the single generic one:
  - **Quick Fix** (2 days, today-forward): typo, image swap, contact info update
  - **Standard Update** (7 days, backwards from go-live): new page, nav change, content section
  - **Website Redesign** (45 days, backwards from go-live): full overhaul, 10-milestone pipeline
- `WebsiteUpdateForm` — new "Scope" dropdown with inline description per option
- `websiteUpdateSchema` (`lib/create-validators.ts`) — `scope` field added
- `resolveTemplate` uses `scope` from `request.details` to pick the right template

---

### Inline proof viewer (`app/_components/proof-viewer.tsx`)

- Detects file type from extension: images → `<img>`, PDF → `<iframe>`, other → nothing (caller keeps download link)
- Loading placeholder and error fallback (download link)
- `defaultOpen` prop — open by default in school proof review, collapsed toggle in internal version list
- `ClientProofReview` — viewer open by default in "ready to review" state; collapsed in already-reviewed and delivered states
- `ItemVersions` — "Preview inline" toggle per version row

---

### "What happens next" messaging on school dashboard

Two signals added to project cards (`app/page.tsx`, school view):

- **Next checkpoint** — finds the first upcoming incomplete milestone with `visibility: "all"` and a due date; displays truncated title + date below the progress bar. School sees what they're waiting for without opening the project.
- **"Still in production"** hint — if a project is in the production stage and last activity (project or any item `updated_at`) is ≥ 2 days ago, shows "Updated X days ago — still in production". Suppressed once a proof goes up or the job is delivered. Reduces "any update?" emails.

Also fixed project card milestone completion count to use `milestone_status` (not the legacy `status` field).

---

### Deferred / not built

- **Cycle linking**: `cycle_number` and `origin_project_id` columns exist on the schema but are not populated when "Start next cycle" converts to a new project. Future work.
- **Auto-linked social campaigns**: when a catalog project is created, auto-suggest a companion social campaign 30 days before delivery. Not built.
- **Portal integration (Phase 14)**: adding Create to the Portal product switcher and a notification badge ("1 proof waiting") on the Portal launcher requires changes to `canopy-platform`. Deferred to the Portal launch sprint — nothing to build in this repo until then.

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
