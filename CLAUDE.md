# Canopy Create — Agent Guide

Canopy Create is a Canopy product for client request intake, internal creative production, revision management, approvals, and final delivery for school creative and web services.

It should be treated as:
- a client services workflow product
- not generic PM software
- not a freelancer marketplace in V1 — but architected so freelancer assignment can be added later
- an integration layer over Plane (the production engine), exactly as Canopy Community wraps Campaign Monitor and Canopy Reach wraps Facebook/LinkedIn

## Repos

| Repo | Purpose |
|---|---|
| `canopy-create` | This repo — Canopy Create product |
| `canopy-platform` | Portal, identity, entitlements, provisioning, launch |
| `photovault` | PhotoVault by Canopy — brand/media assets and archive |
| `canopy-stories` | Canopy Stories |
| `canopy-reach` | Canopy Reach |
| `canopy-community` | Canopy Community |

All repos share one Supabase project.

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript, Node 20 (pinned via `.nvmrc`)
- **Styling**: Tailwind CSS v4
- **UI**: `@globalcloudr/canopy-ui` v0.2.9 — installed from npm
- **Auth/DB**: Supabase shared with the rest of Canopy
- **Storage**: Supabase Storage — `originals` bucket (shared with PhotoVault)
- **Plane**: `lib/plane-client.ts` — `PLANE_API_KEY` + `PLANE_WORKSPACE_SLUG` env vars
- **Deployment**: Vercel

## Repo Structure

```
canopy-create/
  app/
    _components/
      client-shell.tsx          — sidebar nav shell (client component)
      product-shell.tsx         — auth/session/workspace bootstrap shell
      request-type-picker.tsx   — step 1 of new request flow
      design-project-form.tsx
      website-update-form.tsx
      newsletter-brief-form.tsx
      social-request-form.tsx
      milestone-checklist.tsx   — project milestone list (canToggle prop)
      item-status-select.tsx    — deliverable status dropdown
      item-versions.tsx         — proof upload + approval actions (canUpload prop)
      item-comments.tsx         — comments thread
      request-attachments.tsx   — file attachment list + upload
    api/
      app-session/              — workspace-scoped session endpoint
      auth/exchange-handoff/    — Portal handoff exchange
      launcher-products/        — product switcher data
    items/
      [itemId]/page.tsx         — deliverable detail (versions, approvals, comments)
      actions.ts                — uploadVersionAction, submitApprovalAction, addCommentAction
    projects/
      [projectId]/page.tsx      — production sheet
      actions.ts                — addMilestone, toggleMilestone, addItem, changeItemStatus, changeProjectStatus
      page.tsx                  — projects list
    requests/
      [requestId]/page.tsx      — request detail with brief, status, attachments
      new/page.tsx              — new request flow
      actions.ts                — submitCreateRequest, changeRequestStatus, convertRequestToProject, uploadAttachment, deleteAttachment
      page.tsx                  — requests list
    login/page.tsx
    settings/page.tsx
    loading.tsx
    error.tsx
    layout.tsx
    page.tsx                    — dashboard
  docs/
    PRD.md                      — product definition and full roadmap
    progress.md                 — build history (append new sessions at top)
  lib/
    create-data.ts              — all Supabase reads/writes (service client)
    create-data-internal.ts     — (if needed) internal-only data helpers
    create-request-types.ts     — RequestFamily, RequestType enums
    create-roles.ts             — role model and permission gates
    create-status.ts            — status enums (ProjectStatus, RequestStatus, ItemStatus, etc.)
    create-types.ts             — TypeScript interfaces for all domain objects
    create-validators.ts        — Zod validators for intake forms
    plane-client.ts             — Plane API wrapper (createPlaneProject, createPlaneIssue, etc.)
    server-auth.ts              — getServerActionAccess, getServerActionUser, requireWorkspaceAccess
    supabase-client.ts          — browser Supabase client
    supabase-server.ts          — createServerActionClient (cookie-based, for Server Actions)
    workspace-client.ts         — workspace resolution helpers
    workspace-href.ts           — href builder utilities
```

## Domain Model

| Table | Purpose |
|---|---|
| `create_requests` | Client intake submissions |
| `create_projects` | Production jobs (from converted requests) |
| `create_milestones` | Ordered production steps per project |
| `create_items` | Deliverables under a project |
| `create_item_versions` | Proof file versions per deliverable |
| `create_item_comments` | Comments thread per deliverable |
| `create_approvals` | Client approval decisions per version |
| `create_request_attachments` | Source docs and reference files on requests |

**Plane bridge columns**: `plane_project_id` on `create_projects`, `plane_issue_id` on `create_items`.

**Storage paths**:
- `create/{workspaceId}/requests/{requestId}/{timestamp}-{filename}` — request attachments
- `create/{workspaceId}/items/{itemId}/versions/{timestamp}-{filename}` — proof versions

## Role Model

Defined in `lib/create-roles.ts`.

| Role | canManageProjects | canTriageRequests | canUpdateDeliverables | isInternalRole |
|---|---|---|---|---|
| `owner` | ✓ | ✓ | ✓ | ✓ |
| `internal_manager` | ✓ | ✓ | ✓ | ✓ |
| `designer` | | | ✓ | ✓ |
| `developer` | | | ✓ | ✓ |
| `reviewer` | | | | ✓ |
| `client_admin` | | | | |
| `client_staff` | | | | |
| platform operator | ✓ | ✓ | ✓ | — |

## Request Families and Types

Defined in `lib/create-request-types.ts`.

Request families: `design_production`, `website_update`, `managed_communications`

Request types (mapped to form components):
- `design_project` → `DesignProjectForm`
- `website_update` → `WebsiteUpdateForm`
- `newsletter_brief` → `NewsletterBriefForm`
- `social_request` → `SocialRequestForm`

All per-type brief fields are stored in `create_requests.details` (JSONB) — no migration needed for new fields within a type.

## Auth Pattern

**Server Actions**: use `getServerActionAccess(workspaceId)` — reads cookie session, returns `{ user, role, isPlatformOperator }`. Gate mutations with `canManageProjects`, `canTriageRequests`, `canUpdateDeliverables`.

**Route handlers**: use `requireWorkspaceAccess(request, workspaceId)` from `lib/server-auth.ts`.

**Service client**: use `createClient(url, serviceRoleKey)` directly in `lib/create-data.ts` for all data reads/writes — not the cookie client.

## Plane Integration

- `lib/plane-client.ts` wraps the Plane API (`https://api.plane.so/api/v1`)
- Fire-and-log pattern — always wrap in try/catch, never throw to the user
- `createPlaneProject(name, identifier, description)` — called on request → project conversion
- `createPlaneIssue(planeProjectId, title)` — called on deliverable add
- Plane workspace: `PLANE_WORKSPACE_SLUG` env var
- API key: `PLANE_API_KEY` env var (rotate immediately if exposed)

## Roadmap

See `docs/PRD.md` for the full phase-by-phase plan. Summary:

| Phase | Focus |
|---|---|
| 8 | Delivery — "mark as delivered", final files view for client |
| 9 | Client-filtered view — role-aware request/project lists and dashboard |
| 10 | Activity feed — project event log replacing email threads |
| 11 | Recurring production — clone project for next cycle, PhotoVault link |
| 12 | Assignee tracking — personal work queue, Plane sync |
| 13 | Notifications — in-app bell + email for client events |
| 14 | Portal launch integration — Create in the Portal product switcher |
| 15 | Deployment — production Vercel, smoke test, monitoring |

## Rules

- Keep Create tightly aligned to real service workflows — not generic PM abstractions
- Requests, revisions, approvals, and delivery are first-class objects
- Support recurring catalog/source-document workflows
- All data operations scoped by `workspace_id`
- All Supabase reads/writes live in `lib/create-data.ts`
- Use `@canopy/ui` for interface work — no new component libraries
- Use `lib/server-auth.ts` for all auth — do not re-implement
- Plane sync is always fire-and-log — never block the user on Plane failure
- Run `npx tsc --noEmit` before considering any change done
- Do not move Create-specific workflows into `canopy-platform`

## Validation

```bash
npx tsc --noEmit
```

No ESLint config is present in this repo yet.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3003
NEXT_PUBLIC_PORTAL_URL=https://app.usecanopy.school
PLANE_API_KEY=
PLANE_WORKSPACE_SLUG=
```
