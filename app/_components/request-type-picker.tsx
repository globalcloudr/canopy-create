"use client";

import {
  BodyText,
  Card,
  CardContent,
  CardTitle,
} from "@canopy/ui";

import type { RequestFamily, RequestType } from "@/lib/create-request-types";

export type RequestTypeSelection = {
  family: RequestFamily;
  requestType: RequestType;
};

type PickerOption = {
  title: string;
  description: string;
  family: RequestFamily;
  requestType: RequestType;
};

const PICKER_OPTIONS: PickerOption[] = [
  {
    title: "Design Production",
    description: "Catalogs, brochures, flyers, postcards, and other design collateral.",
    family: "design_production",
    requestType: "catalog_project",
  },
  {
    title: "Website Update",
    description: "Structured web update work for existing school sites and landing pages.",
    family: "website_update",
    requestType: "website_update",
  },
  {
    title: "Managed Newsletter",
    description: "Newsletter planning, content support, and managed communications workflow.",
    family: "managed_communications",
    requestType: "newsletter_request",
  },
  {
    title: "Social Media",
    description: "Social templates, campaigns, and recurring social support requests.",
    family: "managed_communications",
    requestType: "social_media_request",
  },
];

export default function RequestTypePicker({
  onSelect,
}: {
  onSelect: (selection: RequestTypeSelection) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {PICKER_OPTIONS.map((option) => (
        <button
          key={`${option.family}-${option.requestType}`}
          type="button"
          onClick={() =>
            onSelect({
              family: option.family,
              requestType: option.requestType,
            })
          }
          className="block w-full text-left"
        >
          <Card className="h-full transition hover:border-[var(--ring)] hover:shadow-sm">
            <CardContent className="px-5 py-5">
              <CardTitle className="text-lg">{option.title}</CardTitle>
              <BodyText muted className="mt-2">
                {option.description}
              </BodyText>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
