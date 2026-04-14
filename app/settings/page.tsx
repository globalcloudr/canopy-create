"use client";

import { Card, BodyText } from "@canopy/ui";
import { ProductShell } from "../_components/product-shell";
import { navItems } from "../nav";

export default function SettingsPage() {
  return (
    <ProductShell activeNav="settings" navItems={navItems}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card padding="md" className="border border-[#dfe7f4] bg-transparent shadow-none sm:p-7">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7f8ea3]">Product state</p>
          <p className="mt-3 text-[1.2rem] font-semibold tracking-[-0.03em] text-[#172033]">Canopy Create is still in product-definition mode.</p>
          <p className="mt-3 text-[14px] leading-6 text-[#617286]">
            The shell, Portal handoff, and workspace session foundation are in place. The next build work is the real Create
            domain model: requests, projects, milestones, revisions, approvals, and delivery.
          </p>
        </Card>

        <Card padding="md" className="border border-[#dfe7f4] bg-transparent shadow-none sm:p-7">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7f8ea3]">Next implementation areas</p>
          <ul className="mt-4 space-y-2 text-[14px] leading-6 text-[#5f6f82]">
            <li>Request intake and service templates</li>
            <li>Production projects and milestone tracking</li>
            <li>Proofs, revisions, and approvals</li>
            <li>PhotoVault asset linking and prior-cycle source handoff</li>
          </ul>
          <div className="mt-5">
            <BodyText muted>See `docs/PRD.md` for the current product definition.</BodyText>
          </div>
        </Card>
      </div>
    </ProductShell>
  );
}
