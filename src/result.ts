import { jsonify } from './mapper'
import type { FirestoreDocument, JsonDocument } from './model'

export class DocumentResult<T = JsonDocument> {
  constructor(
    private fDoc: FirestoreDocument,
    private convert?: (snap: DocumentResult<JsonDocument>) => T
  ) {}

  get exists(): boolean {
    return !!this.fDoc && !!this.fDoc.fields
  }
  get id(): string | undefined {
    if (!this.exists) return undefined
    const n = this.fDoc.name.split('/')
    return n[n.length - 1]
  }
  toJson(): T | undefined {
    if (!this.exists) return undefined
    const doc = jsonify(this.fDoc)

    return this.convert
      ? this.convert({ id: this.id, toJson: () => doc } as typeof this)
      : (doc as T)
  }
}

interface CollecitonOrQueryResult<T = JsonDocument> {
  readonly length: number
  toList(): T[]
}

// TODO add pageToken
export class CollectionResult<T = JsonDocument> implements CollecitonOrQueryResult<T> {
  private docResults: DocumentResult<T>[]
  constructor(
    private fDocs: FirestoreDocument[],
    private convert?: (snap: DocumentResult<JsonDocument>) => T
  ) {
    this.docResults = this.fDocs.reduce((results, it) => {
      const result = new DocumentResult(it, this.convert)
      return result.exists ? [...results, result] : results
    }, [])
  }

  get length(): number {
    return this.docResults.length
  }

  toList(): T[] {
    return this.docResults.map((it) => it.toJson())
  }
}

export class QueryResult<T = JsonDocument> implements CollecitonOrQueryResult<T> {
  constructor(
    private fDocs: FirestoreDocument[],
    private convert?: (snap: DocumentResult<JsonDocument>) => T
  ) {}

  get length(): number {
    return this.fDocs.filter((it) => !!it.fields).length
  }

  toList(): T[] {
    return this.fDocs.reduce((results, it) => {
      const result = new DocumentResult(it, this.convert)
      return result.exists ? [...results, result.toJson()] : results
    }, [])
  }
}
