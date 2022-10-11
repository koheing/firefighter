import { valueIdentifierify } from './mapper'
import type { FirestoreDocument, JsonDocument } from './model'
import type { Reference } from './reference'

const Operator = {
  '>': 'GREATER_THAN',
  '<': 'LESS_THAN',
  '>=': 'GREATER_THAN_OR_EQUAL',
  '<=': 'LESS_THAN_OR_EQUAL',
  '==': 'EQUAL',
  '!=': 'NOT_EQUAL',
  'array-contains': 'ARRAY_CONTAINS',
  in: 'IN',
  'not-in': 'NOT_IN',
} as const

const Direction = {
  asc: 'ASCENDING',
  desc: 'DESCENDING',
} as const

/**
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery
 */
export type Query = {
  structuredQuery: {
    select?: { fields?: { fieldPath: string }[] }
    from: { collectionId: string; allDescendants: boolean }[]
    where?:
      | {
          compositeFilter?: {
            op: 'AND'
            filters: Where[]
          }
        }
      | Where
    orderBy?: OrderBy[]
    startAt?: Cursor
    endAt?: Cursor
    limit?: number
    offset?: number
  }
}

export type QueryModifierType = keyof Query['structuredQuery']

export interface QueryElement extends Record<string, unknown> {
  type: QueryModifierType
}

/**
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery#Filter
 */
export type Where = {
  fieldFilter: {
    field: { fieldPath: string }
    op: typeof Operator[keyof typeof Operator]
    value: FirestoreDocument['fields']
  }
}
/**
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery#order
 */
export type OrderBy = {
  field: { fieldPath: string }
  direction: typeof Direction[keyof typeof Direction]
}
/**
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Cursor
 */
export type Cursor = { values: FirestoreDocument['fields'][]; before: boolean }

/**
 * The filter to apply.
 */
export function where<T extends JsonDocument>(
  field: keyof T,
  op: keyof typeof Operator,
  value: T[typeof field]
): QueryElement {
  return {
    type: 'where',
    detail: {
      fieldFilter: {
        field: { fieldPath: field },
        op: Operator[op],
        value: { [valueIdentifierify(value)]: value },
      },
    } as Where,
  }
}

/**
 * The order to apply to the query results.
 */
export function orderBy<T extends JsonDocument>(
  field: keyof T,
  direction: keyof typeof Direction = 'asc'
): QueryElement {
  return {
    type: 'orderBy',
    detail: {
      field: { fieldPath: field },
      direction: Direction[direction],
    } as OrderBy,
  }
}

/**
 * A starting point for the query results.
 * **start can only be used once on the same query.**
 */
export function start(type: 'from' | 'after', ...values: unknown[]): QueryElement {
  return {
    type: 'startAt',
    detail: {
      values: values.map((it) => ({ [valueIdentifierify(it)]: it })),
      before: type === 'after' ? false : true,
    },
  }
}

/**
 * A end point for the query results.
 * **end can only be used once on the same query.**
 */
export function end(op: 'to' | 'before', ...values: unknown[]): QueryElement {
  return {
    type: 'endAt',
    detail: {
      values: values.map((it) => ({ [valueIdentifierify(it)]: it })),
      before: op === 'to' ? false : true,
    },
  }
}

/**
 * The maximum number of results to return.
 */
export function limit(count: number): QueryElement {
  return {
    type: 'limit',
    detail: count,
  }
}

/**
 * The number of results to skip.
 */
export function offset(from: number): QueryElement {
  return {
    type: 'offset',
    detail: from,
  }
}

export function buildQuery<T = JsonDocument>(
  reference: Reference<T>,
  queries: QueryElement[],
  picks?: string[],
  allDescendants = false
): Query {
  const structuredQuery = {} as Query['structuredQuery']
  const wheres: Where[] = []
  const orderBys: OrderBy[] = []

  queries.forEach((query: QueryElement & { detail: unknown }) => {
    switch (query.type) {
      case 'where':
        wheres.push(query.detail as Where)
        break
      case 'orderBy':
        orderBys.push(query.detail as OrderBy)
        break
      case 'offset':
        structuredQuery.offset = query.detail as number
        break
      case 'limit':
        structuredQuery.limit = query.detail as number
        break
      case 'startAt':
        if (structuredQuery.startAt)
          throw new Error('start can only be used once on the same query.')
        structuredQuery.startAt = query.detail as Cursor
        break
      case 'endAt':
        if (structuredQuery.endAt) throw new Error('end can only be used once on the same query.')
        structuredQuery.endAt = query.detail as Cursor
    }
  })

  structuredQuery.from = [{ collectionId: reference.id, allDescendants }]
  if (orderBys) structuredQuery.orderBy = orderBys
  if (picks) structuredQuery.select = { fields: picks.map((it) => ({ fieldPath: it })) }
  if (wheres.length > 0)
    structuredQuery.where =
      wheres.length === 1 ? wheres[0] : { compositeFilter: { op: 'AND', filters: wheres } }

  return { structuredQuery }
}
