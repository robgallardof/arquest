import type { AuthConfig } from "@/types/auth";
import type { HttpMethod } from "@/types/http";

/**
 * Supported request body modes.
 */
export type BodyType =
  | "raw"
  | "json"
  | "xml"
  | "text"
  | "form"
  | "form-urlencoded"
  | "graphql"
  | "binary";

/**
 * Single HTTP header entry (checked case-insensitively at send time).
 */
export interface HeaderKV {
  /** Header name (e.g., "Content-Type"). */
  key: string;
  /** Header value (e.g., "application/json"). */
  value: string;
  /** Whether this header should be included in the request. */
  enabled: boolean;
}

/**
 * Single query-string parameter entry.
 */
export interface ParamKV {
  /** Query parameter name. */
  key: string;
  /** Query parameter value. */
  value: string;
  /** Whether this parameter should be included in the URL. */
  enabled: boolean;
}

/**
 * Form field entry for multipart/form-data or x-www-form-urlencoded.
 */
export interface FormField {
  /** Field name. */
  key: string;
  /** Field value as text. Ignored if `file === true`. */
  value: string;
  /** Marks the field as a file part in multipart/form-data. */
  file?: boolean;
  /** Whether this field is included. */
  enabled?: boolean;
}

/**
 * GraphQL body container.
 */
export interface GraphQLBody {
  /** GraphQL query string. */
  query: string;
  /** Optional variables object. */
  variables?: Record<string, unknown>;
}

/**
 * Request body container. The effective Content-Type should be derived from `type`
 * unless the user overrides it explicitly via headers.
 */
export interface RequestBody {
  /** Selected body mode. */
  type: BodyType;

  /** Raw string payload for modes: 'raw' | 'json' | 'xml' | 'text'. */
  raw?: string;

  /**
   * Form fields for 'form' (multipart/form-data) and 'form-urlencoded'.
   * For 'form', entries with `file: true` represent file parts.
   */
  form?: FormField[];

  /** GraphQL structured payload when `type === 'graphql'`. */
  graphql?: GraphQLBody;

  /**
   * UI-specific reference to a binary source when `type === 'binary'`.
   * Could be a file path, blob handle id, etc.
   */
  binaryPath?: string;
}

/**
 * Represents a single HTTP request within a collection.
 * Includes `auth`, which is rendered in the Auth tab and applied via `applyAuth` at send time.
 */
export interface RequestModel {
  /** Unique identifier for the request. */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** Absolute or relative URL. */
  url: string;
  /** HTTP method to use. */
  method: HttpMethod;
  /** Request headers (only those with `enabled` are sent). */
  headers: HeaderKV[];
  /** Query parameters appended to the URL (only `enabled` entries are used). */
  params: ParamKV[];
  /** Optional body payload, depending on `method` and `type`. */
  body?: RequestBody;
  /**
   * Optional authentication configuration applied at send time.
   * If the user sets an explicit "Authorization" header manually,
   * the runner should prefer the manual header over computed auth.
   */
  auth?: AuthConfig;
}

/**
 * Group of requests organized under a named collection.
 */
export interface Collection {
  /** Unique identifier for the collection. */
  id: string;
  /** Collection display name. */
  name: string;
  /** Requests contained in this collection. */
  requests: RequestModel[];
  /**
   * Optional folder structure; each folder lists request ids it owns.
   * The same request id should not appear in multiple folders.
   */
  folders?: { id: string; name: string; requestIds: string[] }[];
}
