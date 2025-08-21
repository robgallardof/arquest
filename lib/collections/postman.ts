import { z } from 'zod'
import type { Collection, RequestModel, HeaderKV, RequestBody } from '@/lib/domain/models'

const Header = z.object({ key: z.string(), value: z.string().optional(), disabled: z.boolean().optional() })
const Url = z.union([z.string(), z.object({ raw: z.string().optional(), host: z.any().optional(), path: z.any().optional(), query: z.array(z.object({ key: z.string(), value: z.string().optional(), disabled: z.boolean().optional() })).optional() })])
const Body = z.object({
  mode: z.enum(['raw','urlencoded','formdata','graphql']).optional(),
  raw: z.string().optional(),
  options: z.any().optional(),
  graphql: z.object({ query: z.string(), variables: z.any().optional() }).optional(),
  urlencoded: z.array(z.object({ key: z.string(), value: z.string().optional(), disabled: z.boolean().optional() })).optional(),
  formdata: z.array(z.object({ key: z.string(), value: z.string().optional(), src: z.string().optional(), disabled: z.boolean().optional(), type: z.string().optional() })).optional()
}).optional()

const FolderOrItem = z.object({ name: z.string().optional(), item: z.array(z.any()).optional(), request: z.any().optional() })
const Root = z.object({ info: z.object({ name: z.string().optional() }).optional(), item: z.array(FolderOrItem) })

function headersToKV(arr: any[]|undefined): HeaderKV[] {
  return (arr || []).map(h => ({ key: String(h.key||''), value: String(h.value||''), enabled: !h.disabled }))
}
function urlToString(u: any): string {
  if (!u) return ''
  if (typeof u === 'string') return u
  if (u.raw) return String(u.raw)
  const host = Array.isArray(u.host) ? u.host.join('.') : (u.host || '')
  const path = Array.isArray(u.path) ? '/' + u.path.join('/') : (u.path ? '/' + u.path : '')
  const query = Array.isArray(u.query) ? '?' + u.query.filter((q:any)=>!q.disabled).map((q:any)=>`${q.key}=${encodeURIComponent(q.value||'')}`).join('&') : ''
  return `${host}${path}${query}`
}
function toBody(b:any|undefined): RequestBody|undefined {
  if (!b || !b.mode) return undefined
  if (b.mode === 'raw') return { type: 'raw', raw: b.raw ?? '' }
  if (b.mode === 'graphql' && b.graphql) return { type: 'graphql', graphql: { query: b.graphql.query, variables: b.graphql.variables } }
  if (b.mode === 'urlencoded') return { type: 'form-urlencoded', form: (b.urlencoded||[]).map((x:any)=>({ key:x.key, value:x.value||'', enabled:!x.disabled })) }
  if (b.mode === 'formdata') return { type: 'form', form: (b.formdata||[]).map((x:any)=>({ key:x.key, value:x.value||x.src||'', enabled:!x.disabled, file: x.type==='file' })) }
  return undefined
}

export function importPostman(json: unknown): Collection {
  const parsed = Root.parse(json)
  const colId = crypto.randomUUID()
  const name = parsed.info?.name || 'Imported Postman'
  const requests: RequestModel[] = []

  function walk(items: any[]) {
    for (const it of items) {
      if (it.item && Array.isArray(it.item)) { walk(it.item); continue }
      if (it.request) {
        const r = it.request
        const req: RequestModel = {
          id: crypto.randomUUID(),
          name: it.name || r.name || 'Request',
          url: urlToString(r.url),
          method: (r.method || 'GET').toUpperCase(),
          headers: headersToKV(r.header),
          params: [],
          body: toBody(r.body)
        }
        requests.push(req)
      }
    }
  }
  walk(parsed.item)
  return { id: colId, name, requests }
}

export function exportPostman(col: Collection) {
  return {
    info: { name: col.name, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: col.requests.map(r => ({
      name: r.name,
      request: {
        method: r.method,
        header: r.headers.filter(h=>h.enabled).map(h=>({ key: h.key, value: h.value })),
        url: r.url,
        body: r.body?.type === 'raw' ? { mode: 'raw', raw: r.body.raw ?? '' }
          : r.body?.type === 'graphql' && r.body.graphql ? { mode: 'graphql', graphql: r.body.graphql }
          : r.body?.type === 'form' && r.body.form ? { mode: 'formdata', formdata: r.body.form.map(f=>({ key:f.key, value:f.value })) }
          : r.body?.type === 'form-urlencoded' && r.body.form ? { mode: 'urlencoded', urlencoded: r.body.form.map(f=>({ key:f.key, value:f.value })) }
          : undefined
      }
    }))
  }
}
