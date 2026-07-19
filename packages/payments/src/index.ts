import { z } from "zod";

export const usdcTransferRequestSchema = z.object({
  orderId: z.string().min(1),
  payerPublicKey: z.string().min(32),
  recipientPublicKey: z.string().min(32),
  amountBaseUnits: z.bigint().positive(),
});

export type UsdcTransferRequest = z.infer<typeof usdcTransferRequestSchema>;

export interface PaymentTransaction {
  readonly orderId: string;
  readonly signature: string;
  readonly amountBaseUnits: bigint;
}
