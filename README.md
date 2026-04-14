# Canopy Create

Client-facing request, production, revision, and delivery system for the creative and digital services provided to school clients.

**GitHub**: https://github.com/globalcloudr/canopy-create  
**Status**: Active development — core request, project, and milestone workflow is live in repo  
**Live URL**: Not deployed yet

## What Canopy Create Is

Canopy Create is a first-party Canopy product for managing school creative services from intake through delivery.

It combines:
- a client request layer
- an internal production workflow layer
- revision and approval loops
- recurring source-document handoff for projects like catalogs

This is not generic project management software. It is a purpose-built workflow product for the real services already offered to clients.

## Version 1 Product Direction

Version 1 is for:
- school clients
- internal creative / production team

Later versions may support freelancer assignment, which is why the product should be shaped like a mini Upwork-style service workspace from the beginning.

## V1 Service Templates

Initial request templates should reflect real client work:

- catalogs
- brochures
- postcards
- booklets
- yearbooks
- factsheets
- HTML email newsletters
- social media templates
- business cards
- table throws
- display booths
- canopy
- embroidery
- brand refresh
- logo design
- annual report
- presentation deck
- full website redesign
- landing page design
- recruitment campaign materials
- custom request

## Core Workflow

1. Client submits a request
2. Internal team reviews and triages it
3. Request becomes a managed production job
4. Team uploads proofs and revisions
5. Client approves or requests modifications
6. Final files are delivered and retained

Recurring workflows such as catalogs must also support:
- prior-cycle asset lookup
- source text export
- client copy updates
- proof and correction rounds

## Current Product Shape

Core product areas:
- requests
- projects
- milestones
- deliverables
- revisions
- approvals
- activity history
- files and source documents

Integrations:
- `canopy-platform` for auth, workspaces, memberships, entitlements, and launch
- `photovault` for reusable brand/media assets and prior-cycle references

## Current Repo State

This repo started from the canonical Canopy product scaffold and now has the first working Canopy Create product slice in place.

Currently present:
- Next.js 16 / React 19 / TypeScript / Tailwind v4 app shell
- Portal handoff exchange and workspace-backed product session
- overview dashboard with active/open workspace summaries
- requests directory with active/all filtering
- projects directory with active/all filtering
- new request flow with typed request-family picker
- specialized V1 request forms:
  - design project
  - website update
  - managed newsletter
  - social request
- request detail view with structured brief rendering
- request-to-project conversion flow
- project detail view with:
  - project status controls
  - milestone checklist
  - milestone add / complete / reopen behavior
- route-level loading state and error boundary

Still to do:
- richer deliverables tracking under projects
- approvals, revisions, and file delivery workflow
- request attachments and source-document handling
- PhotoVault asset linking
- Portal launch integration completion in `canopy-platform`
- deployment and production smoke coverage

## How to Run

```bash
cp .env.local.example .env.local
# fill in Supabase credentials
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
```

For production / preview deployments, `NEXT_PUBLIC_PORTAL_URL` should point to the real Portal host and `NEXT_PUBLIC_APP_URL` should point to the deployed Create app.

## Data Model Status

Current implemented tables / migrations:
- `create_requests`
- `create_projects`
- `create_items`
- `create_milestones`
- request `details` JSON payload support

Current implemented product flows:
- create request
- view request
- convert request to project
- view project
- manage project milestones
- manage project status

## Docs

- Product definition: [docs/PRD.md](./docs/PRD.md)
- Build history: [docs/progress.md](./docs/progress.md)
- Agent guide: [CLAUDE.md](./CLAUDE.md)
