import type { FulfillmentOrderInput } from "@advertek/fulfillment";
import type { SqlExecutor } from "./executor.js";

export interface RecordedQuery {
  readonly text: string;
  readonly params: readonly unknown[];
}

export type QueryResponder = (
  text: string,
  params: readonly unknown[],
) => readonly unknown[];

export interface FakeSqlExecutor extends SqlExecutor {
  readonly queries: RecordedQuery[];
}

/**
 * Recording fake for the SqlExecutor seam. Transactions execute inline
 * against the same recorder, so tests can assert both the statements and
 * that they ran inside `transaction(...)`.
 */
export function createFakeExecutor(
  responder: QueryResponder = () => [],
): FakeSqlExecutor {
  const queries: RecordedQuery[] = [];
  const executor: FakeSqlExecutor = {
    queries,
    query<T>(text: string, params: readonly unknown[] = []): Promise<readonly T[]> {
      queries.push({ text, params });
      return Promise.resolve(responder(text, params) as readonly T[]);
    },
    transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      return fn(executor);
    },
  };
  return executor;
}

export function lastQuery(executor: FakeSqlExecutor): RecordedQuery {
  const query = executor.queries[executor.queries.length - 1];
  if (!query) {
    throw new Error("expected at least one recorded query");
  }
  return query;
}

/** A valid FulfillmentOrderInput with an integer-bigint customs value. */
export function fulfillmentInputFixture(): FulfillmentOrderInput {
  const address = {
    name: "Ada Lovelace",
    address1: "1 Print Way",
    city: "Toronto",
    postal_code: "M1M 1M1",
    country_code: "CA",
  };
  return {
    internalOrderId: "ord_1",
    customerOrderNumber: "CUST-1",
    orderedAt: new Date("2026-08-01T12:00:00.000Z"),
    locationCode: "NYK",
    shippingService: "ground",
    orderType: "standard",
    soldTo: address,
    shipTo: address,
    items: [
      {
        internalItemId: "item_1",
        customsValueUsdCents: 19_990n,
        options: [],
        spec: {
          productLine: "wideFormat",
          dimensions: { width: 610, height: 914 },
          stock: { material: "13oz matte vinyl", weight: 450 },
          finish: ["matte"],
          quantity: 40,
          turnaround: "standard",
          assets: [{ url: "https://assets.example.com/banner.pdf" }],
        },
      },
    ],
  };
}
