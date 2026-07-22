import { z } from "zod";
import { createOkxAuthHeaders, type OkxHttpMethod } from "./okx-signing.js";

export interface OkxCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly apiPassphrase: string;
  readonly baseUrl: string;
  /** True for OKX Demo Trading API keys — adds the required `x-simulated-trading: 1` header. */
  readonly isDemo?: boolean;
}

export class OkxApiError extends Error {
  override readonly name = "OkxApiError";
  readonly code: string;
  readonly httpStatus: number;

  constructor(message: string, code: string, httpStatus: number) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface OkxRequestInput {
  readonly method: OkxHttpMethod;
  readonly path: string;
  readonly query?: Record<string, string>;
  readonly body?: Record<string, unknown>;
}

/** Minimal client surface — a thin, signed wrapper around OKX's `{code,msg,data}` envelope. */
export interface OkxHttpClient {
  request(input: OkxRequestInput): Promise<unknown[]>;
}

const okxEnvelopeSchema = z.object({
  code: z.string(),
  msg: z.string(),
  data: z.array(z.unknown()),
});

export type OkxFetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; json(): Promise<unknown> }>;

export interface CreateOkxHttpClientOptions {
  readonly fetchImpl?: OkxFetchLike;
  readonly now?: () => Date;
}

export function createOkxHttpClient(
  credentials: OkxCredentials,
  options: CreateOkxHttpClientOptions = {},
): OkxHttpClient {
  const fetchImpl: OkxFetchLike = options.fetchImpl ?? fetch;

  return {
    async request(input) {
      const requestPath = `${input.path}${buildQueryString(input.query)}`;
      const bodyJson = input.body !== undefined ? JSON.stringify(input.body) : "";
      const headers = createOkxAuthHeaders({
        credentials,
        method: input.method,
        requestPath,
        body: bodyJson,
        ...(options.now ? { now: options.now } : {}),
      });
      if (credentials.isDemo) {
        headers["x-simulated-trading"] = "1";
      }

      const response = await fetchImpl(`${credentials.baseUrl}${requestPath}`, {
        method: input.method,
        headers,
        ...(bodyJson ? { body: bodyJson } : {}),
      });

      const rawJson = await response.json();
      const envelope = okxEnvelopeSchema.parse(rawJson);
      if (envelope.code !== "0") {
        throw new OkxApiError(
          `OKX API error ${envelope.code}: ${envelope.msg}`,
          envelope.code,
          response.status,
        );
      }
      return envelope.data;
    },
  };
}

function buildQueryString(query: Record<string, string> | undefined): string {
  if (!query) {
    return "";
  }
  const entries = Object.entries(query).filter(([, value]) => value.length > 0);
  if (entries.length === 0) {
    return "";
  }
  const params = new URLSearchParams(entries);
  return `?${params.toString()}`;
}

// --- Funding: balances & deposit address -----------------------------------

export const okxFundingBalanceSchema = z.object({
  ccy: z.string(),
  bal: z.string(),
  availBal: z.string(),
  frozenBal: z.string(),
});
export type OkxFundingBalance = z.infer<typeof okxFundingBalanceSchema>;

export async function getOkxFundingBalances(
  client: OkxHttpClient,
  ccy?: string,
): Promise<OkxFundingBalance[]> {
  const data = await client.request({
    method: "GET",
    path: "/api/v5/asset/balances",
    ...(ccy ? { query: { ccy } } : {}),
  });
  return z.array(okxFundingBalanceSchema).parse(data);
}

export const okxDepositAddressSchema = z.object({
  chain: z.string(),
  ccy: z.string(),
  addr: z.string(),
  memo: z.string().optional(),
});
export type OkxDepositAddress = z.infer<typeof okxDepositAddressSchema>;

export async function getOkxDepositAddress(
  client: OkxHttpClient,
  ccy: string,
): Promise<OkxDepositAddress[]> {
  const data = await client.request({
    method: "GET",
    path: "/api/v5/asset/deposit-address",
    query: { ccy },
  });
  return z.array(okxDepositAddressSchema).parse(data);
}

// --- Convert: USDC -> CAD ----------------------------------------------------

export const okxConvertEstimateQuoteSchema = z.object({
  quoteId: z.string(),
  baseCcy: z.string(),
  quoteCcy: z.string(),
  /** Quote-currency amount per 1 unit of base currency, per OKX Convert docs. */
  cnvtPx: z.string(),
  rfqSz: z.string(),
  rfqSzCcy: z.string(),
  ttlMs: z.string(),
});
export type OkxConvertEstimateQuote = z.infer<typeof okxConvertEstimateQuoteSchema>;

export interface EstimateOkxConvertQuoteInput {
  readonly baseCcy: string;
  readonly quoteCcy: string;
  readonly rfqSz: string;
  readonly rfqSzCcy: string;
  readonly clQReqId?: string;
}

export async function estimateOkxConvertQuote(
  client: OkxHttpClient,
  input: EstimateOkxConvertQuoteInput,
): Promise<OkxConvertEstimateQuote> {
  const data = await client.request({
    method: "POST",
    path: "/api/v5/asset/convert/estimate-quote",
    body: {
      baseCcy: input.baseCcy,
      quoteCcy: input.quoteCcy,
      side: "sell",
      rfqSz: input.rfqSz,
      rfqSzCcy: input.rfqSzCcy,
      ...(input.clQReqId ? { clQReqId: input.clQReqId } : {}),
    },
  });
  const [quote] = z.array(okxConvertEstimateQuoteSchema).parse(data);
  if (!quote) {
    throw new Error("OKX estimate-quote returned no data");
  }
  return quote;
}

export const okxConvertTradeResultSchema = z.object({
  quoteId: z.string(),
  tradeId: z.string(),
  baseCcy: z.string(),
  quoteCcy: z.string(),
  fillBaseSz: z.string(),
  /** Actual quote-currency (CAD) amount received — the source of truth for "resulting fiat amount". */
  fillQuoteSz: z.string(),
  state: z.string(),
  clTReqId: z.string().optional(),
  ts: z.string(),
});
export type OkxConvertTradeResult = z.infer<typeof okxConvertTradeResultSchema>;

export interface ExecuteOkxConvertTradeInput {
  readonly quoteId: string;
  readonly baseCcy: string;
  readonly quoteCcy: string;
  readonly sz: string;
  readonly szCcy: string;
  readonly clTReqId?: string;
}

export async function executeOkxConvertTrade(
  client: OkxHttpClient,
  input: ExecuteOkxConvertTradeInput,
): Promise<OkxConvertTradeResult> {
  const data = await client.request({
    method: "POST",
    path: "/api/v5/asset/convert/trade",
    body: {
      quoteId: input.quoteId,
      baseCcy: input.baseCcy,
      quoteCcy: input.quoteCcy,
      side: "sell",
      sz: input.sz,
      szCcy: input.szCcy,
      ...(input.clTReqId ? { clTReqId: input.clTReqId } : {}),
    },
  });
  const [result] = z.array(okxConvertTradeResultSchema).parse(data);
  if (!result) {
    throw new Error("OKX convert/trade returned no data");
  }
  return result;
}

// --- Withdrawal (withdrawal-permission credentials only) --------------------

export const okxWithdrawalResultSchema = z.object({
  ccy: z.string(),
  amt: z.string(),
  wdId: z.string(),
  clientId: z.string().optional(),
});
export type OkxWithdrawalResult = z.infer<typeof okxWithdrawalResultSchema>;

export interface RequestOkxWithdrawalInput {
  readonly ccy: string;
  readonly amt: string;
  /** OKX `dest`: "3" = internal transfer, "4" = on-chain/external withdrawal. */
  readonly dest: "3" | "4";
  readonly toAddr: string;
  readonly chain?: string;
  readonly clientId?: string;
}

/**
 * Requests a withdrawal out of OKX. Deliberately requires a client built
 * from {@link OkxWithdrawalCredentials} — never call this with a
 * trading-permission client. The automatic sweep never calls this function.
 */
export async function requestOkxWithdrawal(
  client: OkxHttpClient,
  input: RequestOkxWithdrawalInput,
): Promise<OkxWithdrawalResult> {
  const data = await client.request({
    method: "POST",
    path: "/api/v5/asset/withdrawal",
    body: {
      ccy: input.ccy,
      amt: input.amt,
      dest: input.dest,
      toAddr: input.toAddr,
      ...(input.chain ? { chain: input.chain } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
    },
  });
  const [result] = z.array(okxWithdrawalResultSchema).parse(data);
  if (!result) {
    throw new Error("OKX withdrawal returned no data");
  }
  return result;
}
