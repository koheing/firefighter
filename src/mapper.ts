import type { FirestoreDocument, JsonDocument, ValueIdentifier } from './model'

/**
 * [FirestoreDocument](https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents#Document) to JsonDocument
 * @param fDoc FirestoreDocument
 * @returns JsonDocument
 */
export function jsonify(fDoc: Pick<FirestoreDocument, 'fields'>): JsonDocument {
  return Object.entries(fDoc.fields).reduce((json, [key, value]) => {
    return { ...json, [key]: jsonValuify(value) }
  }, {})

  function jsonValuify(suspect: Record<string, unknown>): unknown {
    if (typeof suspect !== 'object') return suspect

    const [key] = Object.keys(suspect) as [ValueIdentifier]
    switch (key) {
      case 'nullValue':
      case 'booleanValue':
      case 'stringValue':
      case 'geoPointValue':
      case 'referenceValue':
      case 'timestampValue':
        return suspect[key]
      case 'integerValue':
      case 'doubleValue':
        return +suspect[key]
      case 'mapValue':
        return jsonify(suspect[key] as FirestoreDocument)
      case 'arrayValue':
        return !suspect[key]['values']
          ? []
          : suspect[key]['values'].map((it: Record<string, unknown>) => jsonValuify(it))
    }
  }
}

/**
 * JsonDocument to [FirestoreDocument](https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents#Document)
 * @param json JsonDocument
 * @returns FirestoreDocument
 */
export function firestify(json: JsonDocument): Pick<FirestoreDocument, 'fields'> {
  const fields = Object.entries(json).reduce((json, [key, value]) => {
    const k = valueIdentifierify(value)
    switch (k) {
      case 'nullValue':
      case 'booleanValue':
      case 'integerValue':
      case 'doubleValue':
      case 'stringValue':
      case 'bytesValue':
      case 'geoPointValue':
      case 'referenceValue': {
        json[key] = { [k]: value }
        return json
      }
      case 'timestampValue': {
        json[key] = { [k]: value instanceof Date ? value.toISOString() : value }
        return json
      }
      case 'arrayValue':
        json[key] = {
          [k]: {
            values: (value as Array<unknown>).map((it) => {
              const key = valueIdentifierify(it)
              const value = key !== 'mapValue' ? it : firestify(it)
              return { [key]: value }
            }),
          },
        }
        return json
      case 'mapValue':
        json[key] = { [k]: firestify(value as Record<string, unknown>) }
        return json
    }
  }, {})

  return { fields }
}

// TODO: check referenceValue and bytesValue
export function valueIdentifierify(suspect: unknown): ValueIdentifier {
  if (suspect === null) return 'nullValue'
  if (typeof suspect === 'boolean') return 'booleanValue'
  if (typeof suspect === 'number' && suspect % 1 === 0) return 'integerValue'
  if (typeof suspect === 'number' && suspect % 1 !== 0) return 'doubleValue'
  if (Array.isArray(suspect)) return 'arrayValue'
  if (suspect instanceof Date) return 'timestampValue'
  if (
    typeof suspect === 'object' &&
    typeof suspect['longitude'] === 'number' &&
    typeof suspect['latitude'] === 'number'
  )
    return 'geoPointValue'
  if (typeof suspect === 'object') return 'mapValue'
  if (typeof suspect === 'string') {
    const timestamp = suspect.match(
      /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/
    )
    if (!timestamp || timestamp.length === 0) return 'stringValue'
    return 'timestampValue'
  }
  return 'referenceValue'
}
