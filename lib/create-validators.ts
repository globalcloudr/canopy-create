import { z } from "zod";

const designRequestTypes = [
  "catalog_project",
  "brochure_project",
  "flyer_project",
  "postcard_project",
  "banner_project",
  "fact_sheet_project",
  "other",
] as const;

export const designProjectSchema = z.object({
  formType: z.literal("design_project"),
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  workflowFamily: z.literal("design_production"),
  requestType: z.enum(designRequestTypes),
  description: z
    .string()
    .trim()
    .min(10, "Please add a short description of the design request."),
  audience: z.string().trim().optional(),
  format: z.enum(["print", "digital", "both"]).optional(),
  quantity: z.string().trim().optional(),
  deliveryDate: z.string().trim().optional(),
});

export const websiteUpdateSchema = z.object({
  formType: z.literal("website_update"),
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  workflowFamily: z.literal("website_update"),
  requestType: z.literal("website_update"),
  targetUrl: z.string().trim().url("Enter a valid target URL."),
  updateDetails: z
    .string()
    .trim()
    .min(10, "Please add the requested website update details."),
  priority: z.enum(["low", "normal", "urgent"]).optional(),
  desiredGoLiveDate: z.string().trim().optional(),
});

export const newsletterBriefSchema = z.object({
  formType: z.literal("newsletter_brief"),
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  workflowFamily: z.literal("managed_communications"),
  requestType: z.literal("newsletter_request"),
  audienceSegment: z
    .enum(["all_families", "prospective_families", "staff", "alumni", "all"])
    .optional(),
  targetSendDate: z
    .string()
    .trim()
    .min(1, "Please provide a target send date."),
  subjectLineIdea: z.string().trim().optional(),
  keyTopics: z
    .string()
    .trim()
    .min(10, "Please add the key topics for this newsletter."),
  featuredEvents: z.string().trim().optional(),
});

export const socialRequestSchema = z.object({
  formType: z.literal("social_request"),
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  workflowFamily: z.literal("managed_communications"),
  requestType: z.literal("social_media_request"),
  targetPlatforms: z
    .string()
    .trim()
    .min(2, "Please select or describe the target platforms."),
  tone: z.enum(["professional", "casual", "inspiring", "urgent"]).optional(),
  campaignGoals: z
    .string()
    .trim()
    .min(10, "Please add the campaign goals."),
  callToAction: z.string().trim().optional(),
  desiredPostDate: z.string().trim().optional(),
});

export const createRequestSubmissionSchema = z.discriminatedUnion("formType", [
  designProjectSchema,
  websiteUpdateSchema,
  newsletterBriefSchema,
  socialRequestSchema,
]);

export type DesignProjectInput = z.infer<typeof designProjectSchema>;
export type WebsiteUpdateInput = z.infer<typeof websiteUpdateSchema>;
export type NewsletterBriefInput = z.infer<typeof newsletterBriefSchema>;
export type SocialRequestInput = z.infer<typeof socialRequestSchema>;
export type CreateRequestSubmissionInput = z.infer<
  typeof createRequestSubmissionSchema
>;
