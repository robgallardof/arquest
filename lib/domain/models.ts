export type HttpMethod = 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'
export type BodyType = 'raw'|'json'|'xml'|'text'|'form'|'form-urlencoded'|'graphql'|'binary'
export interface HeaderKV { key: string; value: string; enabled: boolean }
export interface ParamKV { key: string; value: string; enabled: boolean }
export interface RequestBody {
  type: BodyType
  raw?: string
  form?: { key: string; value: string; file?: boolean; enabled?: boolean }[]
  graphql?: { query: string; variables?: any }
  binaryPath?: string
}
export interface RequestModel {
  id: string; name: string; url: string; method: HttpMethod;
  headers: HeaderKV[]; params: ParamKV[]; body?: RequestBody
}
export interface Collection {
  id: string; name: string; requests: RequestModel[];
  folders?: { id: string; name: string; requestIds: string[] }[]
}
