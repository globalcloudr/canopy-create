# Canopy Create — Agent Guide

Canopy Create is a Canopy product for client request intake, internal creative production, revision management, approvals, and final delivery for school creative and web services.

It should be treated as:
- a client services workflow product
- not generic PM software
- not a freelancer marketplace in V1
- but architected so freelancer assignment can be added later

## Repos

| Repo | Purpose |
|---|---|
| `canopy-create` | This repo — Canopy Create product |
| `canopy-platform` | Portal, identity, entitlements, provisioning, launch |
| `photovault` | PhotoVault by Canopy — brand/media assets and archive |
| `canopy-stories` | Canopy Stories |
| `canopy-reach` | Canopy Reach |

All repos share one Supabase project.

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript, Node 20
- **Styling**: Tailwind CSS v4
- **UI**: `@canopy/ui` vendored from `vendor/canopy-ui-0.1.4.tgz`
- **Auth/DB**: Supabase shared with the rest of Canopy
- **Deployment**: Vercel

## Product Definition

Canopy Create has two connected layers:

1. **Client request layer**
- clients submit structured requests using service templates
- clients attach files, source docs, and notes
- clients review proofs, request modifications, and approve final work

2. **Production workflow layer**
- internal team triages and accepts requests
- requests become managed production jobs
- jobs move through milestones, revisions, approvals, and delivery

## Version 1 Focus

V1 should support:
- school clients
- internal managers
- designers
- developers
- reviewers

V1 should not yet include:
- bidding
- public freelancer marketplace
- payments / escrow
- proposal competition

## V1 Service Templates

Initial curated service templates:
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

These should remain curated by the product, not user-created arbitrarily in V1.

## Recurring Production Support

Canopy Create must support recurring service workflows, especially things like catalogs and annual reports where the workflow may begin with:
- locating a prior-cycle artifact
- exporting source text from the previous version
- sending editable content back to the client
- receiving updates
- starting design/layout
- managing proof and correction rounds

This is a core product requirement, not an edge case.

## Planned Domain Model

Likely core tables / objects:
- `create_requests`
- `create_request_messages`
- `create_request_files`
- `create_projects`
- `create_project_milestones`
- `create_assignments`
- `create_deliverables`
- `create_deliverable_versions`
- `create_approvals`
- `create_activity_log`
- `create_service_templates`
- `create_workflow_templates`

## Planned Roles

Client roles:
- `client_admin`
- `client_staff`

Internal roles:
- `internal_manager`
- `designer`
- `developer`
- `reviewer`

Future:
- `freelancer`

The system should be designed so work can later be assigned to freelancers without reworking the request/project/approval model.

## Portal Integration

Create should launch from Portal using the standard Canopy handoff model:

1. Portal creates a short-lived handoff row
2. Product receives `?launch=<code>&workspace=<slug>`
3. Product exchanges the code through `/api/auth/exchange-handoff`
4. Product resolves workspace context from `/api/app-session`
5. In-app switching routes through Portal handoff endpoints

## PhotoVault Integration

PhotoVault should remain the source of truth for reusable:
- brand assets
- approved photography
- archived prior-cycle materials
- logos and templates

Create should link to those assets rather than re-owning them where possible.

## Current Repo Structure

```
canopy-create/
  app/
    _components/
      product-shell.tsx
    api/
      app-session/
      auth/exchange-handoff/
      launcher-products/
    globals.css
    layout.tsx
    page.tsx
    settings/
  docs/
    PRD.md
    progress.md
  lib/
    product-data.ts
    server-auth.ts
    supabase-client.ts
    workspace-client.ts
    workspace-href.ts
```

## Current Scaffold Notes

- The repo still uses the generic scaffold data layer name `lib/product-data.ts`
- Product-specific Create tables and APIs are not implemented yet
- Basic shell/session/handoff pieces are already in place
- Product key is currently set to `create_canopy` in the session route scaffold

## Rules

- Keep Create tightly aligned to real service workflows, not generic PM abstractions
- Treat requests, revisions, approvals, and delivery as first-class objects
- Support recurring catalog/source-document workflows from the start
- Keep all data scoped by `workspace_id`
- Use `@canopy/ui` for interface work
- Use `photovault` as the asset reference layer when reusable brand/media assets are involved
- Run `npm run build` before considering changes complete
