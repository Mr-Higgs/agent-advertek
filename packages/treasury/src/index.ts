import { z } from "zod";

export const okxApiResponseSchema = z.object({
  code: z.string(),
  msg: z.string(),
  data: z.array(z.unknown()),
});

export const treasurySweepRequestSchema = z.object({
  asset: z.literal("USDC"),
  amountBaseUnits: z.bigint().positive(),
  destinationAccount: z.string().min(1),
});

export type TreasurySweepRequest = z.infer<
  typeof treasurySweepRequestSchema
>;

export interface ReconciliationRecord {
  readonly orderId: string;
  readonly transactionSignature: string;
  readonly amountBaseUnits: bigint;
  readonly reconciledAt: Date;
}
