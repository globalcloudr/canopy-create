# Canopy Create

Client-facing request, production, revision, and delivery system for the creative and digital services provided to school clients.

**GitHub**: https://github.com/globalcloudr/canopy-create  
**Status**: Product definition and scaffold alignment in progress  
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

## Planned Product Shape

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

This repo started from the canonical Canopy product scaffold and is now being aligned to the Canopy Create product definition.

Currently present:
- Next.js 16 / React 19 / TypeScript / Tailwind v4 scaffold
- Portal handoff exchange
- server-backed workspace session
- in-app product switcher shell
- basic dashboard and settings placeholders

Still to do:
- create the actual Create domain model and routes
- replace generic scaffold data layer with Create-specific tables
- define product entitlement and register it in `canopy-platform`

## How to Run

```bash
cp .env.local.example .env.local
# fill in Supabase credentials
npm install
npm run dev
```

Requires Node 20 (pinned in `.nvmrc`).

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PORTAL_URL=https://usecanopy.school
```

## Docs

- Product definition: [docs/PRD.md](./docs/PRD.md)
- Build history: [docs/progress.md](./docs/progress.md)
- Agent guide: [CLAUDE.md](./CLAUDE.md)
