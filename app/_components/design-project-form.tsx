"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BodyText,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@canopy/ui";

import { submitCreateRequestAction, uploadAttachmentAction } from "@/app/requests/actions";
import {
  designProjectSchema,
  type DesignProjectInput,
} from "@/lib/create-validators";
import type { RequestFamily, RequestType } from "@/lib/create-request-types";

type DesignProjectField =
  | "title"
  | "requestType"
  | "description"
  | "audience"
  | "format"
  | "quantity"
  | "deliveryDate";

type DesignProjectErrors = Partial<Record<DesignProjectField, string>>;

const DESIGN_REQUEST_OPTIONS: Array<{ value: RequestType; label: string }> = [
  { value: "catalog_project", label: "Catalog" },
  { value: "brochure_project", label: "Brochure" },
  { value: "flyer_project", label: "Flyer" },
  { value: "postcard_project", label: "Postcard" },
  { value: "banner_project", label: "Banner" },
  { value: "fact_sheet_project", label: "Fact Sheet" },
  { value: "other", label: "Other" },
];

const FORMAT_OPTIONS = [
  { value: "print", label: "Print" },
  { value: "digital", label: "Digital" },
  { value: "both", label: "Print + Digital" },
];

export default function DesignProjectForm({
  workspaceId,
  family,
  requestType,
  successRedirect,
  defaultTitle,
  defaultDeliveryDate,
}: {
  workspaceId: string;
  family: RequestFamily;
  requestType: RequestType;
  successRedirect: string;
  defaultTitle?: string;
  defaultDeliveryDate?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [selectedRequestType, setSelectedRequestType] =
    useState<RequestType>(requestType);
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [format, setFormat] = useState<DesignProjectInput["format"]>(undefined);
  const [quantity, setQuantity] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate ?? "");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<DesignProjectErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildPayload(): DesignProjectInput {
    return {
      formType: "design_project",
      title,
      workflowFamily: "design_production",
      requestType: selectedRequestType as DesignProjectInput["requestType"],
      description,
      audience: audience || undefined,
      format,
      quantity: quantity || undefined,
      deliveryDate: deliveryDate || undefined,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = designProjectSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const nextErrors: DesignProjectErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as DesignProjectField] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      const result = await submitCreateRequestAction(workspaceId, parsed.data);
      if (result.error || !result.requestId) {
        setFormError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append("file", file);
        await uploadAttachmentAction(workspaceId, result.requestId, fd);
      }
      router.push(successRedirect);
    });
  }

  return (
    <div>
      <p className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
        Design Project Request
      </p>
      <BodyText muted className="mt-1">
        Capture the core information for a new design production request.
      </BodyText>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Fall catalog redesign"
          />
          {errors.title ? (
            <BodyText className="text-sm text-red-600">{errors.title}</BodyText>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Project Type</Label>
          <Select
            value={selectedRequestType}
            onValueChange={(v) => setSelectedRequestType(v as RequestType)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select a design request type" />
            </SelectTrigger>
            <SelectContent>
              {DESIGN_REQUEST_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.requestType ? (
            <BodyText className="text-sm text-red-600">{errors.requestType}</BodyText>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the design request, goals, and any key context."
            rows={5}
          />
          {errors.description ? (
            <BodyText className="text-sm text-red-600">{errors.description}</BodyText>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Prospective families, current students…"
            />
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <Select
              value={format ?? ""}
              onValueChange={(v) =>
                setFormat(v as DesignProjectInput["format"] ?? undefined)
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Print, digital, or both" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Print Quantity</Label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="500 copies"
            />
          </div>

          <div className="space-y-2">
            <Label>Delivery Date</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Reference Files <span className="text-[var(--text-muted)] font-normal">(optional)</span></Label>
          <BodyText muted className="text-xs">Attach logos, existing materials, or examples to help us get started.</BodyText>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
          >
            + Attach files
          </button>
          {selectedFiles.length > 0 && (
            <ul className="mt-1 space-y-1">
              {selectedFiles.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    className="text-[var(--text-muted)] hover:text-red-500"
                    onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {formError ? (
          <BodyText className="text-sm text-red-600">{formError}</BodyText>
        ) : null}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending || !workspaceId}>
            {isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
