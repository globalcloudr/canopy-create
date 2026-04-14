# Canopy Create — Product Definition and Roadmap

## Summary

Canopy Create is a client-facing request, production, revision, and delivery system for the creative and digital services provided to school clients.

It is designed to support:
- client request intake via structured service templates
- internal production workflow (milestones, deliverables, assignments)
- proof uploads and revision rounds
- client approvals
- final file delivery
- recurring source-document workflows (catalogs, annual reports)

## Product Positioning

Canopy Create should feel like a mini Upwork-style service workspace — purpose-built for the real services already offered to school clients. It is not generic project management software.

The integration-layer model: Canopy Create is the school-facing experience; Plane is the production workflow engine underneath. Schools never touch Plane. The internal team works in both.

Version 1 is not a freelancer marketplace, but the architecture allows freelancer assignment later without reworking the core model.

## Users

| Role | Access |
|---|---|
| `client_admin` | Submit requests, view all org submissions, approve proofs |
| `client_staff` | Submit requests, view own submissions |
| `owner` | Full workspace control |
| `internal_manager` | Triage, convert, assign, update status |
| `designer` / `developer` | View and update deliverable status, upload proofs |
| `reviewer` | View and submit approvals |

Future: `freelancer` (assignment without re-architecting request/approval model)

## Version 1 Service Templates

Curated by the product — not user-created in V1:

- catalogs, brochures, postcards, booklets, yearbooks, factsheets
- HTML email newsletters
- social media templates
- business cards, table throws, display booths, canopy, embroidery
- brand refresh, logo design, annual report, presentation deck
- full website redesign, landing page design
- recruitment campaign materials
- custom request

## Core Workflow

1. Client submits a request using a service template
2. Internal team reviews, triages, changes status
3. Request is converted to a managed production job (project)
4. Project gets milestones (production steps) and deliverables
5. Team uploads proof versions (PDFs, files)
6. Client reviews, approves or requests changes — in-app, not via email
7. Final files are delivered and retained

## Recurring Production

Canopy Create must support recurring workflows where:
- a prior-cycle project is cloned
- content is exported for client review and update
- updated content re-enters the design/proof/approval loop
- final files are retained alongside prior-cycle archives

This is a core requirement for catalog, annual report, and newsletter clients.

## Data Model

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

## Integration Boundaries

### Portal owns
- auth, workspaces, memberships, entitlements, launch

### PhotoVault owns
- reusable brand/media assets
- prior-cycle asset archive
- approved photography and logos

### Canopy Create owns
- request workflow (intake → triage → conversion)
- production tracking (milestones, deliverables, status)
- revisions and proof versions
- approvals and approval history
- final file delivery
- activity log (planned)

---

## Implementation Status

### Completed

| Feature | Status |
|---|---|
| Intake forms (design, website, newsletter, social) | Done |
| Request detail with structured brief | Done |
| Request attachments (source docs) | Done |
| Request → project conversion | Done |
| Plane project creation on convert | Done |
| Project production sheet (milestones, deliverables) | Done |
| Plane issue creation on deliverable add | Done |
| Deliverable detail (versions, approvals, comments) | Done |
| Proof file uploads to Supabase Storage | Done |
| Role-based permissions (UI + server action layer) | Done |
| Dashboard with actionable summaries | Done |

### Roadmap

---

## Phase 8 — Delivery

**Goal**: Close the production loop with a clear handoff moment.

Currently, a deliverable can be `completed` in status, but there is no explicit delivery event. The client has no "here are your final files" moment — they have to navigate into the deliverable themselves.

**Scope**:
- "Mark as delivered" action on a deliverable (internal team only), separate from status — sets a `delivered_at` timestamp and optionally designates one version as the final file
- Delivery confirmation visible in the project view (delivered badge, date)
- Client-facing "Your Files" section on the project page — shows only delivered deliverables with their final download links
- Email notification hook (placeholder for now, actual send in a later phase)

**Why it matters**: Without this, the product has no handoff moment. Every other professional service tool has one. It's also the moment that signals billing completion in future phases.

---

## Phase 9 — Client-filtered view

**Goal**: Clients see a workspace focused on their own submissions, not the full internal workspace.

Currently, requests and projects pages show all workspace data. A `client_admin` at a school should only see their school's requests and projects — which is already the case since everything is workspace-scoped. But `client_staff` should only see their own submissions, and the overall UI should be tailored to client context: no internal triage controls, a "Your Requests" framing rather than a full request queue.

**Scope**:
- `client_staff` filtered to own `submitted_by_user_id` on requests and projects lists
- Client-facing request list framed as "Your Requests" with client-relevant statuses (no "In Triage" language)
- Client-facing project list focused on active work and pending approvals
- Dashboard for client roles: pending approvals prominent, active projects, recent deliveries
- Internal dashboard stays as-is for internal roles

**Why it matters**: The same interface cannot work for both the school admin submitting a brochure request and the internal designer managing the queue. Role-aware framing is what makes the product feel like a client portal rather than an internal tool shared with clients.

---

## Phase 10 — Activity feed

**Goal**: Replace the email thread with an in-product project log.

Currently, there is no record of what happened on a project — when it was created, when a proof was uploaded, when the client approved. The comments thread on each deliverable is the closest thing, but it has no system events.

**Scope**:
- `create_activity_events` table: `event_type`, `workspace_id`, `project_id`, `item_id` (nullable), `actor_user_id`, `payload` (JSON), `created_at`
- Server-side event recording on: request submitted, project created, milestone toggled, deliverable added, version uploaded, approval submitted, delivered
- Activity feed panel on the project detail page — chronological log of system events and comments together
- Actor name resolution from profiles

**Why it matters**: Clients currently have no idea what's happening on their project without asking. The activity feed is the async replacement for status emails. It also creates the audit trail required for any future billing or SLA tracking.

---

## Phase 11 — Recurring production

**Goal**: Support the catalog/annual report cycle where the same workflow runs every term.

This is the most distinctive requirement in the PRD and the one most specific to school clients. No generic PM tool handles it natively.

**Scope**:
- "Start new cycle" action on a completed project — clones the project with its milestone structure and deliverable titles, resets all statuses to `pending`, links `origin_project_id` to the previous cycle
- Cycle history view on project page — "Cycle 1 (2024)", "Cycle 2 (2025)" breadcrumb
- Source document handoff: designated deliverable type for "client content update" — client uploads their updated copy, team receives it, production begins
- PhotoVault link on deliverable — pull prior-cycle reference files from PhotoVault without leaving Create

**Why it matters**: Catalog clients run the same workflow 1–2x per year. Without cycle support, the team manually recreates the project structure every time. This is the feature that makes Create irreplaceable for recurring clients.

---

## Phase 12 — Assignee tracking

**Goal**: Track who on the internal team owns each deliverable.

Currently, deliverables have an `assignee_id` column in the schema but nothing uses it. Assignment is the foundation for workload visibility and future freelancer support.

**Scope**:
- Assignee picker on the deliverable row in the project sheet — lists workspace members with internal roles
- Assigned deliverables appear on a personal "My Work" view for designers and developers
- Assignee shown on deliverable detail header
- Plane issue assignee sync when `assignee_id` is set

**Why it matters**: Without assignment, the internal team has no personal queue — everything lives in the project view and there is no way to know what you are responsible for. It is also the prerequisite for freelancer support, since freelancers are just external assignees.

---

## Phase 13 — Notifications

**Goal**: Proactive alerts so users do not have to poll the app.

**Scope**:
- In-app notification bell (unread count, dropdown) — new proof uploaded, approval requested, approval received, comment on your deliverable
- Email notification for client events: proof ready for review, project delivered
- Notification preferences per user (in-app always on; email opt-out)
- Use Supabase Realtime or a simple polling interval for in-app badge

**Why it matters**: Currently clients must remember to log in and check their requests. A "proof ready for your review" email is the primary mechanism that drives client action in any service workflow product.

---

## Phase 14 — Portal launch integration

**Goal**: Create launches from the Canopy portal like Stories and Reach.

**Scope**:
- Enable `canopy_create` product key in `canopy-platform` entitlements
- Add Create to the product switcher in the Portal sidebar
- Wire up the Portal handoff → Create exchange flow end-to-end in staging
- Verify workspace context passes correctly on first load

**Why it matters**: Until this is done, Create cannot be accessed by school clients through the normal Portal login flow. It is the prerequisite for any client-facing use.

---

## Phase 15 — Deployment

**Goal**: Create is live on Vercel in production and accessible to real clients.

**Scope**:
- Vercel project setup for `canopy-create`
- Production environment variables
- Custom domain if applicable
- Smoke test: request → project → proof → approval → delivered end-to-end in production
- Basic error monitoring

**Why it matters**: Nothing matters until it ships.

---

## Out of Scope (V1)

- Bidding / proposals / client selection of team
- Public freelancer marketplace
- Payments or escrow
- Generic workflow builder (workflows are curated per service type)
- Multi-org or agency-facing marketplace view
