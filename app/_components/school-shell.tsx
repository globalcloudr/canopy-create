"use client";

import type { ReactNode } from "react";

import { ProductShell, type NavItem } from "./product-shell";

function WorkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    key: "home",
    href: "/",
    label: "My Work",
    icon: WorkIcon as (props: { className?: string }) => ReactNode,
  },
];

export default function SchoolShell({
  activeNav,
  children,
}: {
  activeNav: string;
  children: ReactNode;
}) {
  return (
    <ProductShell activeNav={activeNav} navItems={navItems}>
      {children}
    </ProductShell>
  );
}
