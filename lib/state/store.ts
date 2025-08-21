'use client'

import { create } from 'zustand'
import { createStore, set as kvSet, get as kvGet, del as kvDel, keys as kvKeys } from 'idb-keyval'
import type { Collection, RequestModel } from '@/lib/domain/models'

type State = {
  collections: Record<string, Collection>
  activeCollectionId?: string
  openRequestId?: string
  upsertCollection: (c: Collection) => void
  removeCollection: (id: string) => void
  setActiveCollection: (id?: string) => void
  setOpenRequest: (id?: string) => void
  upsertRequest: (cId: string, r: RequestModel) => void
}

const PREFIX = 'tp_col_' // solo para migración desde el store por defecto

// ✅ Store dedicado: evita colisiones con otras claves
const KV = createStore('tp-db', 'collections')

// Guard contra re-hidrataciones múltiples (dev/HMR)
let didHydrate = false

/**
 * IndexedDB helpers (idb-keyval) scoped to our custom store.
 */
export const idb = {
  /** Saves a collection keyed by its id. */
  async save(c: Collection): Promise<void> {
    await kvSet(c.id, c, KV)
  },

  /** Loads all collections from our dedicated store. */
  async loadAll(): Promise<Record<string, Collection>> {
    const out: Record<string, Collection> = {}
    const allKeys = await kvKeys(KV) // -> Promise<IDBValidKey[]>
    for (const k of allKeys) {
      const id = String(k)
      const v = (await kvGet(id, KV)) as Collection | undefined
      if (v) out[id] = v
    }
    return out
  },

  /** Removes a collection by id in our dedicated store. */
  async remove(id: string): Promise<void> {
    await kvDel(id, KV)
  },

  /**
   * One-time migration: pulls prefixed keys from the *default* store and moves them to KV.
   * Safe to run even si no hay nada.
   */
  async migrateFromDefault(): Promise<void> {
    // Ojo: usamos kvKeys() sin store para inspeccionar el store por defecto
    const defaultKeys = await kvKeys()
    for (const k of defaultKeys) {
      if (typeof k === 'string' && k.startsWith(PREFIX)) {
        const data = (await kvGet(k)) as Collection | undefined
        if (data) {
          // Guardamos sin prefijo en el store dedicado
          await kvSet(data.id, data, KV)
        }
        // Limpieza del store por defecto para no re-migrar
        await kvDel(k)
      }
    }
  },
}

/**
 * Global app store (Zustand).
 * Mutations are persisted to IndexedDB via `idb`.
 */
export const useStore = create<State>()((set, get) => ({
  collections: {},
  activeCollectionId: undefined,
  openRequestId: undefined,

  upsertCollection: (c) => {
    set((s) => ({ collections: { ...s.collections, [c.id]: c } }))
    void idb.save(c)
  },

  removeCollection: (id) => {
    set((s) => {
      const { [id]: _removed, ...rest } = s.collections
      return { collections: rest }
    })
    void idb.remove(id)
  },

  setActiveCollection: (id) => set({ activeCollectionId: id }),
  setOpenRequest: (id) => set({ openRequestId: id }),

  upsertRequest: (cId, r) => {
    const c = get().collections[cId]
    if (!c) return
    const idx = c.requests.findIndex((x) => x.id === r.id)
    const reqs = [...c.requests]
    if (idx >= 0) reqs[idx] = r
    else reqs.push(r)
    const updated: Collection = { ...c, requests: reqs }
    set((s) => ({
      collections: { ...s.collections, [cId]: updated },
      openRequestId: r.id,
    }))
    void idb.save(updated)
  },
}))

// ---- One-time hydration on the client ----
if (typeof window !== 'undefined' && !didHydrate) {
  didHydrate = true
  ;(async () => {
    // 1) Carga desde el store dedicado
    let loaded = await idb.loadAll()

    // 2) Si está vacío, intenta migrar desde el store por defecto con PREFIX
    if (Object.keys(loaded).length === 0) {
      await idb.migrateFromDefault()
      loaded = await idb.loadAll()
    }

    const ids = Object.keys(loaded)
    const active = ids[0]
    useStore.setState({
      collections: loaded,
      activeCollectionId: active,
      openRequestId: active ? loaded[active]?.requests[0]?.id : undefined,
    })
  })()
}
