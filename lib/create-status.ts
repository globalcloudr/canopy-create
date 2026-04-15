export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export type RequestStatus =
  | "submitted"
  | "in_progress"
  | "client_review"
  | "converted"
  | "completed";

export type ItemStatus = "pending" | "in_progress" | "in_review" | "completed";

export type ApprovalState =
  | "pending"
  | "approved"
  | "approved_with_changes"
  | "changes_requested";

export type ApprovalDecision =
  | "approved"
  | "approved_with_changes"
  | "changes_requested";

export type MilestoneStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked";

export type MilestoneVisibility = "all" | "internal";
