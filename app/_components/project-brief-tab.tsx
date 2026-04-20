import { AppSurface } from "@globalcloudr/canopy-ui";

function briefLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProjectBriefTab({
  briefEntries,
}: {
  briefEntries: [string, string][];
}) {
  if (briefEntries.length === 0) {
    return (
      <AppSurface className="px-6 py-6 sm:px-8">
        <p className="text-[13px] text-[var(--text-muted)]">
          No brief details available.
        </p>
      </AppSurface>
    );
  }

  return (
    <AppSurface className="px-6 py-6 sm:px-8">
      <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--foreground)] mb-4">
        What you submitted
      </p>
      <dl className="divide-y divide-[var(--border)]">
        {briefEntries.map(([key, value]) => (
          <div key={key} className="py-3.5">
            <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
              {briefLabel(key)}
            </dt>
            <dd className="mt-1 text-[14px] leading-6 text-[var(--foreground)] whitespace-pre-wrap">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </AppSurface>
  );
}
