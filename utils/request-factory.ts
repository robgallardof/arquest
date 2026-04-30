import type { RequestModel } from "@/lib/domain/models";

/**
 * Builds a new request with safe defaults.
 */
export function createDefaultRequest(): RequestModel {
  return {
    id: crypto.randomUUID(),
    name: "Request",
    url: "",
    method: "GET",
    headers: [],
    params: [],
    auth: { type: "none", enabled: true },
  };
}
