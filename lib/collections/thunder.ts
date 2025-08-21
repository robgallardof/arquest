import type {
  Collection,
  RequestModel,
  HeaderKV,
  RequestBody,
} from "@/lib/domain/models";

type Method = RequestModel["method"]; // derive the literal union from your model

/** Allowed methods in this app. */
const METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const satisfies Readonly<Method[]>;

/** Type guard for Method. */
function isMethod(x: string): x is Method {
  return (METHODS as readonly string[]).includes(x);
}

/** Coerce any input into a valid Method; default to GET. */
function toMethod(input: unknown): Method {
  const s = String(input ?? "").toUpperCase();
  return isMethod(s) ? s : "GET";
}

/** Convert a loosely-typed headers list to HeaderKV[]. */
function toHeaders(arr: unknown): HeaderKV[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((raw): HeaderKV => {
    const h = (raw ?? {}) as Record<string, unknown>;
    const key = "key" in h ? String(h.key) : "name" in h ? String(h.name) : "";
    const value = "value" in h && h.value != null ? String(h.value) : "";
    const enabled =
      "isDisabled" in h
        ? !Boolean(h.isDisabled)
        : "enabled" in h
        ? Boolean(h.enabled)
        : true;
    return { key, value, enabled };
  });
}

/** Convert a loosely-typed body into RequestBody | undefined. */
function toBody(obj: unknown): RequestBody | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const any = obj as Record<string, unknown>;
  const typeRaw = String(any.type ?? any.mode ?? "raw") as RequestBody["type"];

  if (typeRaw === "graphql" && typeof any.graphql === "object" && any.graphql) {
    const g = any.graphql as Record<string, unknown>;
    return {
      type: "graphql",
      graphql: {
        query: String(g.query ?? ""),
        variables: g.variables as unknown, 
      },
    };
  }

  if (typeRaw === "form" && Array.isArray(any.form)) {
    return {
      type: "form",
      form: any.form.map(
        (f): { key: string; value: string; enabled: boolean } => {
          const row = (f ?? {}) as Record<string, unknown>;
          return {
            key: String(row.key ?? row.name ?? ""),
            value: String(row.value ?? ""),
            enabled: row.enabled !== false,
          };
        }
      ),
    };
  }

  if (typeRaw === "form-urlencoded" && Array.isArray(any.form)) {
    return {
      type: "form-urlencoded",
      form: any.form.map(
        (f): { key: string; value: string; enabled: boolean } => {
          const row = (f ?? {}) as Record<string, unknown>;
          return {
            key: String(row.key ?? row.name ?? ""),
            value: String(row.value ?? ""),
            enabled: row.enabled !== false,
          };
        }
      ),
    };
  }

  const raw =
    typeof any.raw === "string"
      ? any.raw
      : typeof any.text === "string"
      ? any.text
      : typeof any.body === "string"
      ? any.body
      : "";

  return { type: "raw", raw };
}

/** Import Thunder collection into internal shape. */
export function importThunder(json: unknown): Collection {
  const any = (json ?? {}) as Record<string, unknown>;
  const colId = crypto.randomUUID();
  const name = String(
    any.name ?? (any.collection as any)?.name ?? "Imported Thunder"
  );

  const reqs =
    (any?.collection as any)?.requests ??
    (any as any)?.requests ??
    (any as any)?.items ??
    [];
  const list: unknown[] = Array.isArray(reqs) ? reqs : [];

  const requests: RequestModel[] = list.map((rUnknown) => {
    const r = (rUnknown ?? {}) as Record<string, unknown>;
    const url = String(r.url ?? r.endpoint ?? r.requestUrl ?? "");
    const name = String(r.name ?? r.title ?? "Request");
    const method = toMethod(r.method ?? r.httpMethod);

    return {
      id: crypto.randomUUID(),
      name,
      url,
      method,
      headers: toHeaders(r.headers),
      params: [],
      body: toBody(r.body),
    };
  });

  return { id: colId, name, requests };
}

/** Export to a simple Thunder-like JSON. */
export function exportThunder(col: Collection) {
  return {
    name: col.name,
    version: 1,
    requests: col.requests.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      method: r.method,
      headers: r.headers
        .filter((h) => h.enabled)
        .map((h) => ({ key: h.key, value: h.value })),
      body:
        r.body?.type === "graphql" && r.body.graphql
          ? { type: "graphql", graphql: r.body.graphql }
          : r.body?.type === "form" && r.body.form
          ? { type: "form", form: r.body.form }
          : r.body?.type === "form-urlencoded" && r.body.form
          ? { type: "form-urlencoded", form: r.body.form }
          : { type: "raw", raw: r.body?.raw ?? "" },
    })),
  };
}
