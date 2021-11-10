/* eslint-disable @typescript-eslint/no-explicit-any */
export type ValueIdentifier =
  | 'nullValue'
  | 'booleanValue'
  | 'stringValue'
  | 'geoPointValue'
  | 'referenceValue'
  | 'bytesValue'
  | 'timestampValue'
  | 'integerValue'
  | 'doubleValue'
  | 'mapValue'
  | 'arrayValue'

/**
 * @see https://cloud.google.com/firestore/docs/reference/rest/Shared.Types/ArrayValue#Value
 */
export type FirestoreDocumentFieldsValue = { [K in ValueIdentifier]?: unknown }

type FirestoreDocumentFields = Record<string, FirestoreDocumentFieldsValue>

/**
 * @see [Document](https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents#Document)
 */
export type FirestoreDocument = {
  name: string
  fields: FirestoreDocumentFields
  createTime: string
  updateTime: string
}

export type JsonDocument = Record<string, any>
