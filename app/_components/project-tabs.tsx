"use client";

import { useRouter } from "next/navigation";

export default function ProjectTabs({
  tabs,
  activeTab,
  baseUrl,
}: {
  tabs: { key: string; label: string }[];
  activeTab: string;
  baseUrl: string;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-1 rounded-2xl bg-[var(--surface)] p-1 border border-[var(--border)]">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => {
              const sep = baseUrl.includes("?") ? "&" : "?";
              router.push(`${baseUrl}${sep}tab=${tab.key}`, { scroll: false });
            }}
            className={`rounded-xl px-4 py-2 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted,var(--border))]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
