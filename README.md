# Canopy Create

Client-facing request, production, revision, and delivery system for the creative and digital services provided to school clients.

**GitHub**: https://github.com/globalcloudr/canopy-create  
**Status**: Active development — core production loop is complete through approvals and file delivery  
**Live URL**: Not deployed yet

## What Canopy Create Is

Canopy Create is a first-party Canopy product for managing school creative services from intake through delivery.

It combines:
- a client request layer (structured intake forms per service type)
- an internal production workflow layer (projects, milestones, deliverables)
- revision and approval loops (proof uploads, client approvals, change requests)
- file handling for source documents and proof PDFs
- role-based access so clients and internal staff see the right controls

This is not generic project management software. It is a purpose-built workflow product for the real services already offered to school clients.

## Integration Layer Model

Canopy Create follows the same pattern as Canopy Community (Campaign Monitor) and Canopy Reach (Facebook/LinkedIn). Canopy Create is the school-facing experience layer; Plane is the production workflow engine running underneath. Schools never interact with Plane directly — they only see Canopy Create. Internal team members work in both.

- `plane_project_id` on `create_projects` links to a Plane project
- `plane_issue_id` on `create_items` links to a Plane issue
- Sync is fire-and-log — Plane failures never block the user

## Version 1 Product Direction

V1 is for:
- school clients (client_admin, client_staff)
- internal creative / production team (owner, internal_manager, designer, developer, reviewer)

Later versions may support freelancer assignment, which is why the product is shaped like a mini Upwork-style service workspace from the start.

## V1 Service Templates

- catalogs, brochures, postcards, booklets, yearbooks, factsheets
- HTML email newsletters
- social media templates
- business cards, table throws, display booths, canopy, embroidery
- brand refresh, logo design, annual report, presentation deck
- full website redesign, landing page design
- recruitment campaign materials
- custom request

## Core Workflow

1. Client submits a structured request (one of four intake form types)
2. Internal team reviews, triages, and converts it to a project
3. Project gets milestones and deliverables
4. Team uploads proofs as versioned files
5. Client reviews, approves or requests changes
6. Final files are delivered and retained

Recurring workflows (catalogs, annual reports) are a first-class requirement — clone, handoff, update, re-proof.

## Current Implementation State

### Completed

- Next.js 16 / React 19 / TypeScript / Tailwind v4 app shell
- `@canopy/ui` v0.1.10 vendored locally for shared shell, typography, and core app font ownership
- Portal handoff exchange and workspace-backed product session
- Overview dashboard with actionable summaries (client review queue, open requests, active projects)
- Login page for direct-access flows
- Requests directory with active/all filtering
- Projects directory with active/all filtering
- New request flow with typed request-family picker
- Specialized V1 intake forms:
  - Design project (description, audience, format, quantity, delivery date)
  - Website update (URL, details, priority, go-live date)
  - Managed newsletter (audience segment, send date, subject idea, key topics, events)
  - Social request (platforms, tone, campaign goals, CTA, post date)
- Request detail with structured brief rendering, per-field type hints (URL, date, multiline)
- Request-to-project conversion (with Plane project creation)
- Request attachments — upload, signed URL download, delete (Supabase Storage)
- Project detail — production sheet with:
  - Project status controls
  - Milestone checklist with progress bar
  - Deliverable list with status selects
  - Add milestone / add deliverable forms
- Plane sync — project creation on convert, issue creation on deliverable add (fire-and-log)
- Deliverable detail page:
  - Versioned proof uploads (file + label + notes)
  - Approval submission (approved / approved with changes / changes requested)
  - Approval history per version
  - Comments thread with author attribution
- Role-based permissions — full UI layer + server action layer:
  - `canManageProjects`: convert, project status, add milestones, add deliverables
  - `canTriageRequests`: request status changes
  - `canUpdateDeliverables`: item status changes
  - Internal-only: upload proof versions, toggle milestones
  - Client-accessible: submit approvals, post comments, upload attachments
- Outer shell frame now comes from `@canopy/ui` (`AppShellFrame`, `AppShellSidebar`, `AppShellContent`)
- Core Canopy app fonts are now loaded from `@canopy/ui` via `canopyFontVariables`

### Data Model

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

### Pending

- Delivery — "mark as delivered" end state, final files view for client
- Activity feed — chronological project log
- Recurring production — clone project for next cycle
- Client-filtered view — clients see only their own submissions
- PhotoVault asset linking
- Portal-side Create launch enablement in `canopy-platform`
- Deployment

## Roles

| Role | Access |
|---|---|
| `owner` | Full workspace control |
| `internal_manager` | Triage, convert, assign, update status |
| `designer` / `developer` | View and update deliverable status |
| `reviewer` | View and submit approvals |
| `client_admin` | Submit requests, view own work, approve proofs |
| `client_staff` | Submit requests, view own submissions |

Platform operators (`super_admin`, `platform_staff`) have full access to all workspaces.

## How to Run

```bash
cp .env.local.example .env.local
# fill in Supabase + Plane credentials
npm install
npm run dev
```

Requires Node 20 (pinned in `.nvmrc`).

Local dev ports:
- `canopy-platform` Portal: `http://localhost:3000`
- `canopy-create`: `http://localhost:3003`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3003
NEXT_PUBLIC_PORTAL_URL=http://localhost:3000
PLANE_API_KEY=
PLANE_WORKSPACE_SLUG=
```

## Docs

- Product definition and roadmap: [docs/PRD.md](./docs/PRD.md)
- Build history: [docs/progress.md](./docs/progress.md)
- Agent guide: [CLAUDE.md](./CLAUDE.md)
