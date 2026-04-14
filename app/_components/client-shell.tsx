"use client";

import type { ReactNode } from "react";

import { ProductShell, type NavItem } from "./product-shell";

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10.5 12 4l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 9.5V20h11V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5a2 2 0 0 1 2-2h4l1.8 2H18.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 13h4.5l1.5 2h4l1.5-2H20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    key: "home",
    href: "/",
    label: "Overview",
    icon: HomeIcon as (props: { className?: string }) => ReactNode,
  },
  {
    key: "projects",
    href: "/projects",
    label: "Projects",
    icon: FolderIcon as (props: { className?: string }) => ReactNode,
  },
  {
    key: "requests",
    href: "/requests",
    label: "Requests",
    icon: InboxIcon as (props: { className?: string }) => ReactNode,
  },
];

export default function ClientShell({
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
