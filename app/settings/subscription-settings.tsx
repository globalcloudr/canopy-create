"use client";

import { useState, useTransition } from "react";
import { BodyText, Button } from "@globalcloudr/canopy-ui";
import {
  type ProductionSubscription,
  type SubscriptionType,
  SUBSCRIPTION_LABELS,
  CATALOG_DELIVERY_DEFAULTS,
  getCatalogKickoffDate,
  monthName,
} from "@/lib/create-subscriptions";
import { saveSubscriptionAction } from "./actions";

const MONTH_OPTIONS = [
  { value: 1,  label: "January" },
  { value: 2,  label: "February" },
  { value: 3,  label: "March" },
  { value: 4,  label: "April" },
  { value: 5,  label: "May" },
  { value: 6,  label: "June" },
  { value: 7,  label: "July" },
  { value: 8,  label: "August" },
  { value: 9,  label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const CATALOG_TYPES: Exclude<SubscriptionType, "newsletter_monthly">[] = [
  "catalog_fall",
  "catalog_winter_spring",
  "catalog_summer",
];

type SubState = {
  enabled: boolean;
  delivery_month: number;
  delivery_day: number;
  kickoff_lead_days: number;
};

function buildInitialState(
  type: SubscriptionType,
  existing?: ProductionSubscription
): SubState {
  const defaults = type !== "newsletter_monthly" ? CATALOG_DELIVERY_DEFAULTS[type] : null;
  return {
    enabled: existing?.enabled ?? false,
    delivery_month: existing?.delivery_month ?? defaults?.month ?? 8,
    delivery_day: existing?.delivery_day ?? defaults?.day ?? 1,
    kickoff_lead_days: existing?.kickoff_lead_days ?? 56,
  };
}

export default function SubscriptionSettings({
  workspaceId,
  initialSubscriptions,
}: {
  workspaceId: string;
  initialSubscriptions: ProductionSubscription[];
}) {
  const [states, setStates] = useState<Record<SubscriptionType, SubState>>(() => {
    const allTypes: SubscriptionType[] = [
      "catalog_fall",
      "catalog_winter_spring",
      "catalog_summer",
      "newsletter_monthly",
    ];
    const result = {} as Record<SubscriptionType, SubState>;
    for (const type of allTypes) {
      const existing = initialSubscriptions.find((s) => s.subscription_type === type);
      result[type] = buildInitialState(type, existing);
    }
    return result;
  });

  const [saving, setSaving] = useState<SubscriptionType | null>(null);
  const [saved, setSaved] = useState<SubscriptionType | null>(null);
  const [errors, setErrors] = useState<Partial<Record<SubscriptionType, string>>>({});
  const [, startTransition] = useTransition();

  function update(type: SubscriptionType, patch: Partial<SubState>) {
    setStates((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
    setSaved(null);
  }

  function handleSave(type: SubscriptionType) {
    const state = states[type];
    const fd = new FormData();
    fd.set("enabled", String(state.enabled));
    fd.set("delivery_month", String(state.delivery_month));
    fd.set("delivery_day", String(state.delivery_day));
    fd.set("kickoff_lead_days", String(state.kickoff_lead_days));

    setSaving(type);
    setErrors((prev) => ({ ...prev, [type]: undefined }));

    startTransition(async () => {
      const result = await saveSubscriptionAction(workspaceId, type, fd);
      setSaving(null);
      if (result.error) {
        setErrors((prev) => ({ ...prev, [type]: result.error }));
      } else {
        setSaved(type);
        setTimeout(() => setSaved(null), 2000);
      }
    });
  }

  function kickoffDescription(type: SubscriptionType, state: SubState): string {
    if (type === "newsletter_monthly") return "";
    const kickoff = getCatalogKickoffDate(
      state.delivery_month,
      state.delivery_day,
      state.kickoff_lead_days
    );
    return kickoff.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Catalog subscriptions */}
      {CATALOG_TYPES.map((type) => {
        const state = states[type];
        const label = SUBSCRIPTION_LABELS[type];
        const kickoff = kickoffDescription(type, state);
        const isSaving = saving === type;
        const wasSaved = saved === type;
        const error = errors[type];

        return (
          <div
            key={type}
            className={`rounded-2xl border px-5 py-5 transition ${
              state.enabled
                ? "border-[var(--primary)] bg-blue-50/40"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.enabled}
                  onClick={() => update(type, { enabled: !state.enabled })}
                  className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    state.enabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      state.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--foreground)]">{label}</p>
                  <BodyText muted className="mt-0.5">
                    {state.enabled
                      ? `Kickoff reminder sends ${kickoff} — ${state.kickoff_lead_days} days before your target delivery`
                      : "Enable to receive a kickoff reminder email when it's time to start this cycle"}
                  </BodyText>
                </div>
              </div>
            </div>

            {state.enabled && (
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.05em]">
                    Delivery month
                  </label>
                  <select
                    value={state.delivery_month}
                    onChange={(e) => update(type, { delivery_month: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--foreground)]"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.05em]">
                    Approx. delivery day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={state.delivery_day}
                    onChange={(e) =>
                      update(type, { delivery_day: Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1)) })
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--foreground)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-muted)] uppercase tracking-[0.05em]">
                    Lead time (weeks)
                  </label>
                  <select
                    value={state.kickoff_lead_days}
                    onChange={(e) => update(type, { kickoff_lead_days: parseInt(e.target.value, 10) })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--foreground)]"
                  >
                    <option value={42}>6 weeks</option>
                    <option value={49}>7 weeks</option>
                    <option value={56}>8 weeks (recommended)</option>
                    <option value={63}>9 weeks</option>
                    <option value={70}>10 weeks</option>
                  </select>
                </div>
              </div>
            )}

            {state.enabled && (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => handleSave(type)}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save"}
                </Button>
                {wasSaved && (
                  <span className="text-[13px] text-emerald-600 font-medium">✓ Saved</span>
                )}
                {error && (
                  <span className="text-[13px] text-red-600">{error}</span>
                )}
              </div>
            )}

            {!state.enabled && (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    update(type, { enabled: true });
                  }}
                >
                  Enable
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Newsletter */}
      {(() => {
        const type: SubscriptionType = "newsletter_monthly";
        const state = states[type];
        const isSaving = saving === type;
        const wasSaved = saved === type;
        const error = errors[type];

        return (
          <div
            className={`rounded-2xl border px-5 py-5 transition ${
              state.enabled
                ? "border-[var(--primary)] bg-blue-50/40"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={state.enabled}
                onClick={() => update(type, { enabled: !state.enabled })}
                className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  state.enabled ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    state.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <p className="text-[14px] font-semibold text-[var(--foreground)]">
                  Monthly Newsletter
                </p>
                <BodyText muted className="mt-0.5">
                  {state.enabled
                    ? "Reminders send on the 15th (content gathering) and 25th (deadline) of each month"
                    : "Enable to receive monthly content reminders for your newsletter"}
                </BodyText>
              </div>
            </div>

            {state.enabled && (
              <div className="mt-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
                  <span className="text-blue-500">●</span>
                  <span><strong>15th of the month</strong> — "Time to start gathering content for [Month]'s newsletter"</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
                  <span className="text-amber-500">●</span>
                  <span><strong>25th of the month</strong> — "Last call — [Month] newsletter content due soon"</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  const newEnabled = !state.enabled;
                  update(type, { enabled: newEnabled });
                  // Auto-save on toggle for newsletter (no other config needed)
                  const fd = new FormData();
                  fd.set("enabled", String(newEnabled));
                  fd.set("delivery_month", "1");
                  fd.set("delivery_day", "1");
                  fd.set("kickoff_lead_days", "56");
                  setSaving(type);
                  startTransition(async () => {
                    const result = await saveSubscriptionAction(workspaceId, type, fd);
                    setSaving(null);
                    if (result.error) {
                      setErrors((prev) => ({ ...prev, [type]: result.error }));
                    } else {
                      setSaved(type);
                      setTimeout(() => setSaved(null), 2000);
                    }
                  });
                }}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : state.enabled ? "Disable" : "Enable"}
              </Button>
              {wasSaved && (
                <span className="text-[13px] text-emerald-600 font-medium">✓ Saved</span>
              )}
              {error && (
                <span className="text-[13px] text-red-600">{error}</span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
