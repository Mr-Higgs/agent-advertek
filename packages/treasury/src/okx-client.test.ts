import { describe, expect, it, vi } from "vitest";
import {
  OkxApiError,
  createOkxHttpClient,
  estimateOkxConvertQuote,
  executeOkxConvertTrade,
  getOkxDepositAddress,
  getOkxFundingBalances,
  requestOkxWithdrawal,
  type OkxFetchLike,
} from "./okx-client.js";

const credentials = {
  apiKey: "key",
  apiSecret: "secret",
  apiPassphrase: "pass",
  baseUrl: "https://okx.example",
};

function jsonResponse(status: number, body: unknown): { status: number; json(): Promise<unknown> } {
  return { status, json: () => Promise.resolve(body) };
}

describe("createOkxHttpClient", () => {
  it("signs requests and returns the unwrapped data array on success", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { code: "0", msg: "", data: [{ ccy: "USDC" }] })),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    const data = await client.request({ method: "GET", path: "/api/v5/asset/balances" });

    expect(data).toEqual([{ ccy: "USDC" }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string> },
    ];
    expect(url).toBe("https://okx.example/api/v5/asset/balances");
    expect(init.method).toBe("GET");
    expect(init.headers["OK-ACCESS-KEY"]).toBe("key");
    expect(init.headers["OK-ACCESS-SIGN"]).toBeTruthy();
  });

  it("adds the x-simulated-trading header for demo credentials", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { code: "0", msg: "", data: [] })),
    );
    const client = createOkxHttpClient({ ...credentials, isDemo: true }, { fetchImpl });

    await client.request({ method: "GET", path: "/api/v5/asset/balances" });

    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers["x-simulated-trading"]).toBe("1");
  });

  it("omits x-simulated-trading for regular (production) credentials", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { code: "0", msg: "", data: [] })),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    await client.request({ method: "GET", path: "/api/v5/asset/balances" });

    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers["x-simulated-trading"]).toBeUndefined();
  });

  it("builds a query string and includes it in the signed request path", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { code: "0", msg: "", data: [] })),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    await client.request({ method: "GET", path: "/api/v5/asset/balances", query: { ccy: "USDC" } });

    const [url] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toBe("https://okx.example/api/v5/asset/balances?ccy=USDC");
  });

  it("sends a JSON body for POST requests", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { code: "0", msg: "", data: [] })),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    await client.request({ method: "POST", path: "/api/v5/asset/convert/trade", body: { quoteId: "q1" } });

    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { body?: string },
    ];
    expect(init.body).toBe(JSON.stringify({ quoteId: "q1" }));
  });

  it("throws OkxApiError when OKX returns a non-zero code", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { code: "50011", msg: "Invalid signature", data: [] })),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    await expect(
      client.request({ method: "GET", path: "/api/v5/asset/balances" }),
    ).rejects.toBeInstanceOf(OkxApiError);
  });

  it("rejects a malformed envelope that doesn't match OKX's response contract", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { oops: true })),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    await expect(
      client.request({ method: "GET", path: "/api/v5/asset/balances" }),
    ).rejects.toThrow();
  });
});

describe("typed OKX endpoint helpers", () => {
  it("getOkxFundingBalances validates and returns funding balances", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          code: "0",
          msg: "",
          data: [{ ccy: "USDC", bal: "1000", availBal: "1000", frozenBal: "0" }],
        }),
      ),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    const balances = await getOkxFundingBalances(client, "USDC");
    expect(balances).toEqual([{ ccy: "USDC", bal: "1000", availBal: "1000", frozenBal: "0" }]);
  });

  it("getOkxDepositAddress validates and returns deposit addresses", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          code: "0",
          msg: "",
          data: [{ chain: "USDC-Solana", ccy: "USDC", addr: "OkxDepositAddr111" }],
        }),
      ),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    const addresses = await getOkxDepositAddress(client, "USDC");
    expect(addresses[0]?.addr).toBe("OkxDepositAddr111");
  });

  it("estimateOkxConvertQuote returns the parsed quote", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          code: "0",
          msg: "",
          data: [
            {
              quoteId: "q1",
              baseCcy: "USDC",
              quoteCcy: "CAD",
              cnvtPx: "1.35",
              rfqSz: "100",
              rfqSzCcy: "USDC",
              ttlMs: "10000",
            },
          ],
        }),
      ),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    const quote = await estimateOkxConvertQuote(client, {
      baseCcy: "USDC",
      quoteCcy: "CAD",
      rfqSz: "100",
      rfqSzCcy: "USDC",
    });
    expect(quote.quoteId).toBe("q1");
    expect(quote.cnvtPx).toBe("1.35");
  });

  it("estimateOkxConvertQuote throws when OKX returns no data", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(jsonResponse(200, { code: "0", msg: "", data: [] })),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    await expect(
      estimateOkxConvertQuote(client, {
        baseCcy: "USDC",
        quoteCcy: "CAD",
        rfqSz: "100",
        rfqSzCcy: "USDC",
      }),
    ).rejects.toThrow(/no data/);
  });

  it("executeOkxConvertTrade returns the parsed trade result", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          code: "0",
          msg: "",
          data: [
            {
              quoteId: "q1",
              tradeId: "t1",
              baseCcy: "USDC",
              quoteCcy: "CAD",
              fillBaseSz: "100",
              fillQuoteSz: "135.00",
              state: "filled",
              ts: "1700000000000",
            },
          ],
        }),
      ),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    const trade = await executeOkxConvertTrade(client, {
      quoteId: "q1",
      baseCcy: "USDC",
      quoteCcy: "CAD",
      sz: "100",
      szCcy: "USDC",
    });
    expect(trade.tradeId).toBe("t1");
    expect(trade.fillQuoteSz).toBe("135.00");
  });

  it("requestOkxWithdrawal returns the parsed withdrawal result", async () => {
    const fetchImpl: OkxFetchLike = vi.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          code: "0",
          msg: "",
          data: [{ ccy: "CAD", amt: "135.00", wdId: "wd1" }],
        }),
      ),
    );
    const client = createOkxHttpClient(credentials, { fetchImpl });

    const result = await requestOkxWithdrawal(client, {
      ccy: "CAD",
      amt: "135.00",
      dest: "4",
      toAddr: "bank-account-ref",
    });
    expect(result.wdId).toBe("wd1");
  });
});
