import type { RequestFamily, RequestType } from "@/lib/create-request-types";
import type {
  ApprovalDecision,
  ApprovalState,
  ItemStatus,
  ProjectStatus,
  RequestStatus,
} from "@/lib/create-status";

export interface CreateRequest {
  id: string;
  workspace_id: string;
  title: string;
  workflow_family: RequestFamily;
  request_type: RequestType;
  details?: Record<string, unknown> | null;
  status: RequestStatus;
  approval_required: boolean;
  submitted_by_user_id: string;
  assigned_to_user_id: string | null;
  converted_project_id: string | null;
  converted_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProject {
  id: string;
  workspace_id: string;
  origin_request_id: string | null;
  title: string;
  workflow_family: RequestFamily;
  status: ProjectStatus;
  template_key: string | null;
  plane_project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItem {
  id: string;
  workspace_id: string;
  project_id: string | null;
  request_id: string | null;
  title: string;
  item_type: string;
  status: ItemStatus;
  approval_state: ApprovalState;
  due_date: string | null;
  sort_order: number;
  assignee_id: string | null;
  plane_issue_id: string | null;
  delivered_at: string | null;
  final_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  status: "pending" | "completed";
  created_at: string;
}

export interface CreateItemVersion {
  id: string;
  workspace_id: string;
  item_id: string;
  version_label: string;
  file_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateItemComment {
  id: string;
  workspace_id: string;
  item_id: string;
  body: string;
  author_user_id: string;
  created_at: string;
}

export interface CreateApproval {
  id: string;
  workspace_id: string;
  item_id: string;
  version_id: string | null;
  decision: ApprovalDecision;
  note: string | null;
  decided_by: string;
  decided_at: string;
}

export interface CreateRequestAttachment {
  id: string;
  workspace_id: string;
  request_id: string;
  filename: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
}

export type ActivityEventType =
  | "project_status_changed"
  | "milestone_completed"
  | "milestone_uncompleted"
  | "item_status_changed"
  | "version_uploaded"
  | "comment_added"
  | "item_approved"
  | "item_delivered";

export interface CreateActivityEvent {
  id: string;
  workspace_id: string;
  project_id: string;
  item_id: string | null;
  actor_user_id: string;
  event_type: ActivityEventType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
