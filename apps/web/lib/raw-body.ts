import { gunzipSync } from "node:zlib";

/**
 * Reads the exact bytes a webhook sender signed: gzip'd deliveries
 * (`content-encoding: gzip`, which QuickNode Streams may send) are
 * decompressed first, per its signing contract; the result is otherwise the
 * unmodified body text.
 */
export async function readRawBody(request: Request): Promise<string> {
  const buffer = Buffer.from(await request.arrayBuffer());
  const decoded =
    request.headers.get("content-encoding") === "gzip" ? gunzipSync(buffer) : buffer;
  return decoded.toString("utf8");
}
