/**
 * JSON codec for persisted payloads that contain `bigint` (money) or `Date`
 * values — neither survives a plain JSON round-trip. Encoded with a
 * type-tagged wrapper so decoding is unambiguous:
 *
 *   bigint  -> { "$type": "bigint", "value": "<base-10>" }
 *   Date    -> { "$type": "date",   "value": "<ISO 8601>" }
 *
 * Dates are pre-walked before `JSON.stringify` because a `toJSON()` method
 * would otherwise reduce them to bare strings before any replacer runs.
 */

const TYPE_KEY = "$type";

interface TaggedValue {
  readonly [TYPE_KEY]: "bigint" | "date";
  readonly value: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return { [TYPE_KEY]: "bigint", value: value.toString() } satisfies TaggedValue;
  }
  if (value instanceof Date) {
    return { [TYPE_KEY]: "date", value: value.toISOString() } satisfies TaggedValue;
  }
  if (Array.isArray(value)) {
    return value.map(encodeValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, encodeValue(entry)]),
    );
  }
  return value;
}

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(decodeValue);
  }
  if (isPlainObject(value)) {
    const tag = value[TYPE_KEY];
    if (tag === "bigint" && typeof value["value"] === "string") {
      return BigInt(value["value"]);
    }
    if (tag === "date" && typeof value["value"] === "string") {
      return new Date(value["value"]);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, decodeValue(entry)]),
    );
  }
  return value;
}

export function encodePersistedJson(value: unknown): string {
  return JSON.stringify(encodeValue(value));
}

export function decodePersistedJson(text: string): unknown {
  return decodeValue(JSON.parse(text));
}
