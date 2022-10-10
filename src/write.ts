import { firestify, valueIdentifierify } from './mapper'
import type { FirestoreDocument, FirestoreDocumentFieldsValue } from './model'
import type { JsonDocument } from './model'
import type { Reference } from './reference'
import type { SetOption } from './service'

/**
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write
 */
export type Write = {
  updateMask?: { fieldPaths: string[] }
  updateTransforms?: FieldTransform[]
  currentDocument?: {
    exists?: boolean
    updateTime?: string
  }
  update?: Pick<FirestoreDocument, 'fields' | 'name'>
  delete?: string
  transform?: {
    document: string
    fieldTransforms: FieldTransform[]
  }
}

/**
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform
 */
export type FieldTransform = {
  fieldPath?: string
  setToServerValue?: 'REQUEST_TIME'
  increment?: { integerValue: number } | { doubleValue: number }
  maximum?: FirestoreDocumentFieldsValue
  minimum?: FirestoreDocumentFieldsValue
  appendMissingElements?: {
    values: FirestoreDocumentFieldsValue[]
  }
  removeAllFromArray?: {
    values: FirestoreDocumentFieldsValue[]
  }
} & Record<string, unknown>

export class Transformer {
  constructor(public target: FieldTransform) {}
}

/**
 * Adds the given value to the field's current value.
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform
 */
export function increment(value: number): Transformer {
  return new Transformer({
    increment: value % 1 === 0 ? { integerValue: value } : { doubleValue: value },
  })
}

/**
 * Sets the field to the maximum of its current value and the given value.
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform
 */
export function maximum(value: unknown): Transformer {
  return new Transformer({
    maximum: { [valueIdentifierify(value)]: value },
  })
}

/**
 * Sets the field to the minimum of its current value and the given value.
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform
 */
export function minimum(value: unknown): Transformer {
  return new Transformer({
    minimum: { [valueIdentifierify(value)]: value },
  })
}

/**
 * Append the given elements in order if they are not already present in the current field value. If the field is not an array, or if the field does not yet exist, it is first set to the empty array.
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform
 */
export function append(...values: unknown[]): Transformer {
  return new Transformer({
    appendMissingElements: {
      values: values.map((it) => ({ [valueIdentifierify(it)]: it })),
    },
  })
}

/**
 * Remove all of the given elements from the array in the field. If the field is not an array, or if the field does not yet exist, it is set to the empty array.
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write#FieldTransform
 */
export function remove(...values: unknown[]): Transformer {
  return new Transformer({
    removeAllFromArray: {
      values: values.map((it) => ({ [valueIdentifierify(it)]: it })),
    },
  })
}

/**
 * The time at which the server processed the request, with millisecond precision.
 * @see https://cloud.google.com/firestore/docs/reference/rest/v1/Write#servervalue
 */
export function serverTimestamp(): Transformer {
  return new Transformer({ setToServerValue: 'REQUEST_TIME' })
}

export type WriteBuilder = {
  build: () => { writes: Write[]; transaction?: string }
  set: <T = JsonDocument>(
    reference: Reference<T>,
    data: JsonDocument,
    option?: SetOption
  ) => WriteBuilder
  update: <T = JsonDocument>(reference: Reference<T>, data: JsonDocument) => WriteBuilder
  delete: <T = JsonDocument>(reference: Reference<T>) => WriteBuilder
}

export function writeBuilder(transactionId?: string): WriteBuilder {
  const writes: Write[] = []
  return {
    set<T = JsonDocument>(
      reference: Reference<T>,
      data: JsonDocument,
      option: SetOption = { merge: false }
    ) {
      const { path } = reference
      const p = path.replace('https://firestore.googleapis.com/v1/', '')
      writes.push(buildWrite(p, data, option.merge))
      return this
    },
    update<T = JsonDocument>(reference: Reference<T>, data: JsonDocument) {
      const { path } = reference
      const p = path.replace('https://firestore.googleapis.com/v1/', '')
      writes.push(buildWrite(p, data, true))
      return this
    },
    delete<T = JsonDocument>(reference: Reference<T>) {
      const { path } = reference
      const p = path.replace('https://firestore.googleapis.com/v1/', '')
      writes.push(buildWrite(p))
      return this
    },
    build() {
      return {
        writes,
        transaction: transactionId,
      }
    },
  }
}

function buildWrite(path: string, data?: Record<string, unknown>, exists = false): Write {
  if (!data) return { delete: path }

  const transformees: FieldTransform[] = []
  const transformKeys = []
  const updatees: Record<string, unknown> = {}
  const updateKeys = []

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'undefined') continue
    if (value instanceof Transformer) {
      transformees.push({ fieldPath: key, ...value.target })
      transformKeys.push(key)
      continue
    }
    updatees[key] = value
    updateKeys.push(key)
  }

  const write: Write = {}

  if (updateKeys.length > 0) {
    write.update = { ...firestify(updatees), name: path }
    write.updateMask = { fieldPaths: updateKeys }
    write.currentDocument = { exists }
  }

  if (transformKeys.length > 0) {
    if (updateKeys.length > 0) write.updateTransforms = transformees
    else
      write.transform = {
        document: path,
        fieldTransforms: transformees,
      }
  }

  return write
}
