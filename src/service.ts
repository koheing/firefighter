import type { Firestore, Reference } from './reference'
import { CollectionResult, DocumentResult, QueryResult } from './result'
import type { FirestoreDocument, JsonDocument } from './model'
import { documentId } from './id'
import type { DocumentId } from './id'
import { buildRequest, request } from './request'
import { buildQuery } from './query'
import type { QueryElement } from './query'
import { writeBuilder } from './write'

export type FromConverter<T = JsonDocument> = (result: DocumentResult<JsonDocument>) => T
export type ToConverter<T = JsonDocument> = (data: T) => JsonDocument
export type SetOption = { merge: boolean }
export type FindOption<T> = {
  /**
   *  The fields on document to return from Firestore. If not set, returns all fields.
   */
  picks?: (keyof T)[]
}
export type ConvertOption<T extends FromConverter | ToConverter> = {
  /**
   * convert fetched data to something in client
   */
  convert?: T
}

export type FromOption<T> = ConvertOption<FromConverter<T>> & FindOption<T>

/**
 * Fetch data from Firestore
 * @param reference reference
 * @param option.convert convert fetched data to something in client
 * @param option.picks The fields on document to return from Firestore. If not set, returns all fields.
 */
export function from<T = JsonDocument>(reference: Reference, option: FromOption<T> = {}) {
  const { convert } = option
  return {
    /**
     * Find single document.
     * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/get
     */
    async find(): Promise<DocumentResult<T>> {
      const fetcher = reference.firestore.fetch as typeof fetch
      const data = await request<FirestoreDocument>(
        fetcher,
        buildRequest(reference.firestore).forFind(reference, option as FindOption<unknown>),
        { disable404: true }
      )

      return new DocumentResult(data, convert)
    },
    /**
     * Find multiple documents.
     * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/list
     */
    async findAll(): Promise<CollectionResult<T>> {
      const fetcher = reference.firestore.fetch as typeof fetch
      const pickDocuments = (data: { documents: FirestoreDocument[] }) =>
        data && data.documents ? data.documents : []

      const data = await request<{ documents: FirestoreDocument[] }>(
        fetcher,
        buildRequest(reference.firestore).forFindAll(reference, option as FindOption<unknown>),
        { disable404: true }
      )

      return new CollectionResult(pickDocuments(data), convert)
    },
    /**
     * Query data from collection.
     * You can use **where**, **orderBy**, **start**, **end**, **limit**, **offset**
     * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/runQuery
     */
    async query(...queryElements: QueryElement[]): Promise<QueryResult<T>> {
      const q = buildQuery(reference, queryElements, option.picks as string[])
      const fetcher = reference.firestore.fetch as typeof fetch

      const pickDocuments = (data: { document?: FirestoreDocument }[]) =>
        data && data.length > 0 && !!data[0].document ? data.map((it) => it.document) : []

      const data = await request<{ document?: FirestoreDocument }[]>(
        fetcher,
        buildRequest(reference.firestore).forQuery(reference, q),
        { disable404: true }
      )
      return new QueryResult(pickDocuments(data), convert)
    },
    /**
     * Query data from **all same name** collection.
     * You can use **where**, **orderBy**, **start**, **end**, **limit**, **offset**
     * @deprecated Please use `groupQuery`. This will be removed \@1.0.0
     * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/runQuery
     */
    async queryAll(...queryElements: QueryElement[]): Promise<QueryResult<T>> {
      const q = buildQuery(reference, queryElements, option.picks as string[], true)
      const fetcher = reference.firestore.fetch as typeof fetch

      const pickDocuments = (data: { document?: FirestoreDocument }[]) =>
        data && data.length > 0 && !!data[0].document ? data.map((it) => it.document) : []

      const data = await request<{ document?: FirestoreDocument }[]>(
        fetcher,
        buildRequest(reference.firestore).forQuery(reference, q),
        { disable404: true }
      )
      return new QueryResult(pickDocuments(data), convert)
    },
    /**
     * Query data from **all same name** collection.
     * You can use **where**, **orderBy**, **start**, **end**, **limit**, **offset**
     * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/runQuery
     */
    async groupQuery(...queryElements: QueryElement[]): Promise<QueryResult<T>> {
      const q = buildQuery(reference, queryElements, option.picks as string[], true)
      const fetcher = reference.firestore.fetch as typeof fetch

      const pickDocuments = (data: { document?: FirestoreDocument }[]) =>
        data && data.length > 0 && !!data[0].document ? data.map((it) => it.document) : []

      const data = await request<{ document?: FirestoreDocument }[]>(
        fetcher,
        buildRequest(reference.firestore).forQuery(reference, q),
        { disable404: true }
      )
      return new QueryResult(pickDocuments(data), convert)
    },
  }
}

/**
 * Update data on Firestore
 */
export function on<T = JsonDocument>(
  reference: Reference,
  option: ConvertOption<ToConverter<T>> = {}
) {
  const { convert } = option
  return {
    /**
     * Update data. update data if merge is **true**.
     * Use **increment**, **maximum**, **minimum**, **append**, **remove**, **serverTimestamp** if you'd like to use [FieldTransform](https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform)
     * @param option default merge: **false**
     */
    async set(data: T, option: SetOption = { merge: false }): Promise<void> {
      const d = convert ? convert(data) : data
      await batcher(reference.firestore).set(reference, d, option).commit()
    },
    /**
     * Update data.
     * Use **increment**, **maximum**, **minimum**, **append**, **remove**, **serverTimestamp** if you'd like to use [FieldTransform](https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform)
     */
    async update(data: T): Promise<void> {
      const d = convert ? convert(data) : data
      await batcher(reference.firestore).update(reference, d).commit()
    },
    /**
     * Delete data.
     */
    async delete(): Promise<void> {
      await batcher(reference.firestore).delete(reference).commit()
    },
    /**
     * Create data. reference path is not **document** but **collection** .
     * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/createDocument
     */
    async create(data: T): Promise<DocumentId> {
      const fetcher = reference.firestore.fetch as typeof fetch
      const docId = documentId()
      await request(fetcher, buildRequest(reference.firestore).forCreate(reference, data, docId))
      return docId
    },
  }
}

export interface Batcher {
  /**
   * Update data. update data if merge is **true**.
   * Use **increment**, **maximum**, **minimum**, **append**, **remove**, **serverTimestamp** if you'd like to use [FieldTransform](https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform)
   * @param option.merge default **false**
   */
  set: <T = JsonDocument>(reference: Reference, data: T, option?: SetOption) => Batcher
  /**
   * Update data.
   * Use **increment**, **maximum**, **minimum**, **append**, **remove**, **serverTimestamp** if you'd like to use [FieldTransform](https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform)
   */
  update: <T = JsonDocument>(reference: Reference, data: T) => Batcher
  /**
   * Delete data.
   */
  delete: (reference: Reference) => Batcher
  /**
   * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/commit
   */
  commit: () => Promise<void>
}

/**
 * Atomic update multiple data.
 */
export function batcher(firestore: Firestore): Batcher {
  const builder = writeBuilder()
  return {
    set<T = JsonDocument>(reference: Reference, data: T, option: SetOption = { merge: false }) {
      builder.set(reference, data, option)
      return this
    },
    update<T = JsonDocument>(reference: Reference, data: T) {
      builder.update(reference, data)
      return this
    },
    delete(reference: Reference) {
      builder.delete(reference)
      return this
    },
    async commit() {
      const fetcher = firestore.fetch as typeof fetch
      await request(fetcher, buildRequest(firestore).forBatch(builder))
    },
  }
}

export interface Transaction {
  /**
   * Find single document.
   * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/get
   * @param option.convert convert fetched data to something in client
   * @param option.picks The fields on document to return from Firestore. If not set, returns all fields.
   */
  find: <T = JsonDocument>(
    reference: Reference,
    option?: ConvertOption<FromConverter<T>> & FindOption<T>
  ) => Promise<DocumentResult<T>>
  /**
   * Find multiple documents.
   * @see https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/list
   * @param option.convert convert fetched data to something in client
   * @param option.picks The fields on document to return from Firestore. If not set, returns all fields.
   */
  findAll: <T = JsonDocument>(
    reference: Reference,
    option?: ConvertOption<FromConverter<T>> & FindOption<T>
  ) => Promise<CollectionResult<T>>
  /**
   * Update data. update data if merge is **true**.
   * Use **increment**, **maximum**, **minimum**, **append**, **remove**, **serverTimestamp** if you'd like to use [FieldTransform](https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform)
   * @param option.merge default **false**
   */
  set: (reference: Reference, data: JsonDocument, option?: SetOption) => Transaction
  /**
   * Update data.
   * Use **increment**, **maximum**, **minimum**, **append**, **remove**, **serverTimestamp** if you'd like to use [FieldTransform](https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform)
   */
  update: (reference: Reference, data: JsonDocument) => Transaction
  /**
   * Delete data.
   */
  delete: (reference: Reference) => Transaction
}
type NonPromise<T> = T extends Promise<infer U> ? U : T

/**
 * Optimistic transaction
 */
export function transactor(firestore: Firestore): {
  /**
   * @param runner transaction
   * @param option.maxAttempt default : 5
   */
  run: <T>(
    runner: (transaction: Transaction) => T,
    option?: { maxAttempt: number }
  ) => Promise<NonPromise<T>>
} {
  const builder = writeBuilder()
  const transaction: Transaction = {
    async find<T = JsonDocument>(
      reference: Reference,
      option?: ConvertOption<FromConverter<T>> & FindOption<T>
    ) {
      return await from(reference, option).find()
    },
    async findAll<T = JsonDocument>(
      reference: Reference,
      option?: ConvertOption<FromConverter<T>> & FindOption<T>
    ) {
      return await from(reference, option).findAll()
    },
    set(
      reference: Reference,
      data: JsonDocument,
      option: SetOption = { merge: false }
    ): Transaction {
      builder.set(reference, data, option)
      return this
    },
    update(reference: Reference, data: JsonDocument) {
      builder.update(reference, data)
      return this
    },
    delete(reference: Reference) {
      builder.delete(reference)
      return this
    },
  }

  return {
    async run<T>(
      runner: (transaction: Transaction) => T,
      option: { maxAttempt: number } = { maxAttempt: 5 }
    ): Promise<NonPromise<T>> {
      for (let attempt = 0; attempt < option.maxAttempt; attempt++) {
        try {
          const result = runner(transaction)
          if (result instanceof Promise) await result

          const fetcher = firestore.fetch as typeof fetch
          await request(fetcher, buildRequest(firestore).forBatch(builder))

          return result as NonPromise<T>
        } catch (e) {
          if ((e.code && (e.code === 404 || e.code === 413)) || attempt + 1 === option.maxAttempt) {
            throw e
          }
        }
      }
    },
  }
}
