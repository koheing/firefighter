import type { DocumentId } from './id'
import { firestify } from './mapper'
import type { JsonDocument } from './model'
import type { Query } from './query'
import type { Firestore, Reference } from './reference'
import type { FindOption } from './service'
import type { WriteBuilder } from './write'

export type RequestBuilder = {
  forFind: (reference: Reference, option?: FindOption<JsonDocument>) => Parameters<typeof fetch>
  forFindAll: (reference: Reference, option?: FindOption<JsonDocument>) => Parameters<typeof fetch>
  forQuery: (reference: Reference, query: Query) => Parameters<typeof fetch>
  forCreate: (
    reference: Reference,
    data: JsonDocument,
    documentId: DocumentId
  ) => Parameters<typeof fetch>
  forBatch: (manager: WriteBuilder) => Parameters<typeof fetch>
}

export function buildRequest(firestore: Firestore, transactionId?: string): RequestBuilder {
  const {
    credential: { token },
  } = firestore
  const headers = {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : undefined),
  }

  return {
    forFind(reference: Reference, option?: FindOption<unknown>): Parameters<typeof fetch> {
      let { path: p } = reference
      const q = urlQuerify({
        transaction: transactionId,
        ...(option && option.picks ? { mask: { fieldPaths: option.picks } } : undefined),
      })
      if (q.length > 0) p += `?${q}`
      const init: RequestInit = {
        method: 'get',
        headers,
      }

      return [p, init]
    },
    forFindAll(reference: Reference, option?: FindOption<unknown>): Parameters<typeof fetch> {
      let { path: p } = reference
      const q = urlQuerify({
        transaction: transactionId,
        ...(option && option.picks ? { mask: { fieldPaths: option.picks } } : undefined),
      })
      if (q.length > 0) p += `?${q}`
      const init: RequestInit = {
        method: 'get',
        headers,
      }

      return [p, init]
    },
    forQuery(reference: Reference, query: Query): Parameters<typeof fetch> {
      const { path, id } = reference
      const index = path.lastIndexOf(id)
      console.log(index)
      const p = `${path.substring(0, index)}:runQuery`
      const init: RequestInit = {
        method: 'post',
        headers,
        body: JSON.stringify(query),
      }

      return [p, init]
    },
    forCreate(
      reference: Reference,
      data: JsonDocument,
      documentId: DocumentId
    ): Parameters<typeof fetch> {
      const { path } = reference
      const body = JSON.stringify(firestify(data))
      const p = `${path}?documentId=${documentId}`
      const init: RequestInit = {
        method: 'post',
        headers,
        body,
      }
      return [p, init]
    },
    forBatch(builder: WriteBuilder): Parameters<typeof fetch> {
      const p = `${firestore.path}:commit`
      const init: RequestInit = {
        method: 'post',
        headers,
        body: JSON.stringify(builder.build()),
      }

      return [p, init]
    },
  }
}

function urlQuerify(data: unknown): string {
  return queryElementify(data).join('&')

  function queryElementify(data: unknown, parent?: string): string[] {
    if (parent && typeof data !== 'object') return [`${parent}=${data}`]
    if (Array.isArray(data)) {
      return data.reduce((array, it) => [...array, ...queryElementify(it, parent)], [] as string[])
    }
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).reduce((array, [key, value]) => {
        if (typeof value === 'undefined') return array
        const prop = parent ? `${parent}.${key}` : key

        return [...array, ...queryElementify(value, prop)]
      }, [] as string[])
    }
    return []
  }
}

export async function request<T = Record<string, unknown>>(
  fetcher: typeof fetch,
  args: Parameters<typeof fetch>,
  option: {
    disable404?: boolean
  } = {}
): Promise<T | undefined> {
  const res = await fetcher(...args)

  if (!res.ok) {
    const e = await res.json()
    const { error } = Array.isArray(e) ? e[0] : e
    if (option.disable404 && error.code === 404) return undefined
    throw error
  }

  return await res.json()
}
