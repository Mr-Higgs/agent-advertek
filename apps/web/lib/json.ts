/** JSON response helper that stringifies bigint minor units (money convention). */
export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  const body = JSON.stringify(data, (_key, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  return new Response(body, { ...init, headers });
}
