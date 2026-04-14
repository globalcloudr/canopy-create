"use client";

import { useEffect, useState } from "react";

// ─── Storage key ──────────────────────────────────────────────────────────────
const ACTIVE_ORG_KEY = "canopy_create_active_org_id_v1";
const ACTIVE_USER_KEY = "canopy_create_active_user_id_v1";
const WORKSPACE_CHANGE_EVENT = "canopy:workspace-change";

type WorkspaceChangeDetail = {
  workspaceId: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function readStoredWorkspaceId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

export function writeStoredWorkspaceId(workspaceId: string | null) {
  try {
    if (workspaceId) {
      window.localStorage.setItem(ACTIVE_ORG_KEY, workspaceId);
    } else {
      window.localStorage.removeItem(ACTIVE_ORG_KEY);
    }
  } catch {
    // Ignore storage failures but still notify listeners.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<WorkspaceChangeDetail>(WORKSPACE_CHANGE_EVENT, {
        detail: { workspaceId },
      })
    );
  }
}

export function readStoredUserId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_USER_KEY);
  } catch {
    return null;
  }
}

export function writeStoredUserId(userId: string | null) {
  try {
    if (userId) {
      window.localStorage.setItem(ACTIVE_USER_KEY, userId);
    } else {
      window.localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

export function useWorkspaceId() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    setWorkspaceId(readStoredWorkspaceId());

    function handleWorkspaceChange(event: Event) {
      const detail = (event as CustomEvent<WorkspaceChangeDetail>).detail;
      setWorkspaceId(detail?.workspaceId ?? readStoredWorkspaceId());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === ACTIVE_ORG_KEY) {
        setWorkspaceId(event.newValue);
      }
    }

    window.addEventListener(WORKSPACE_CHANGE_EVENT, handleWorkspaceChange as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(WORKSPACE_CHANGE_EVENT, handleWorkspaceChange as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return workspaceId;
}
