# Canopy Create — Product Definition

## Summary

Canopy Create is a client-facing request, production, revision, and delivery system for the creative and digital services provided to school clients.

It is designed to support:
- client request intake
- internal production workflow
- proofs and revisions
- approvals
- final delivery
- recurring source-document workflows such as catalogs

## Product Positioning

Canopy Create should feel like:
- a mini Upwork-style service workspace
- combined with a structured internal production system

Version 1 is not a freelancer marketplace, but the architecture should allow freelancer assignment later.

## Users

Client side:
- school admins
- school staff

Internal side:
- internal managers
- designers
- developers
- reviewers

Future:
- freelancers

## Version 1 Service Templates

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
6. Final files are delivered

## Recurring Production Requirement

Canopy Create must support workflows where the team:
- exports text from a previous catalog or collateral piece
- sends it to the client to update
- receives the updated content back
- moves it into design/layout, proofing, and final delivery

This is a core requirement for recurring school production cycles.

## Version 1 Scope

Include:
- curated request templates
- request submission
- comments / messages
- file attachments
- internal triage
- milestones
- proofs
- revision requests
- approvals
- final delivery
- PhotoVault asset linking
- recurring project support

Do not include yet:
- bidding
- public freelancer marketplace
- payments
- proposals
- generic workflow builder

## Core Objects

- requests
- request messages
- request files
- projects
- milestones
- assignments
- deliverables
- deliverable versions
- approvals
- activity log
- service templates
- workflow templates

## Integration Boundaries

Portal owns:
- auth
- workspaces
- memberships
- entitlements
- launch

PhotoVault owns:
- reusable brand/media assets
- prior-cycle asset archive

Canopy Create owns:
- request workflow
- production tracking
- revisions
- approvals
- delivery
