import { z } from "zod";

export const accessRequestSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name"),
  lastName: z.string().trim().min(1, "Enter your last name"),
  email: z.string().trim().min(1, "Enter your work email").email("Enter a valid email"),
  company: z.string().trim().min(1, "Enter your company name"),
  role: z.string().trim().min(1, "Enter your role"),
  website: z.string().trim().optional(),
  useCase: z.string().trim().min(1, "Select a primary use case"),
  categories: z.array(z.string()).min(1, "Select at least one production category"),
  monthlyVolume: z.string().optional(),
  monthlySpend: z.string().optional(),
  geography: z.string().trim().min(1, "Enter your target geography"),
  integration: z.enum(["MCP", "REST", "both", "unsure"]),
  settlement: z.enum(["invoice", "card", "bank", "USDC", "unsure"]),
  pilotDate: z.string().optional(),
  workflow: z.string().trim().min(20, "Describe your workflow in a few sentences"),
  consent: z.boolean().refine((v) => v, {
    message: "Consent is required",
  }),
  websiteHp: z.string().optional(),
});

export type AccessRequestInput = z.input<typeof accessRequestSchema>;
export type AccessRequest = z.infer<typeof accessRequestSchema>;
