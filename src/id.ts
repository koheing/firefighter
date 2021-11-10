export type DocumentId = string
export function documentId(): DocumentId {
  const candidates = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const range = Array.from<string>({ length: 20 })
  return range.reduce((docId) => {
    docId += candidates.charAt(Math.floor(Math.random() * candidates.length))
    return docId
  }, '')
}
