import type { JsonDocument } from './model'
import type { FromConverter, ToConverter } from './service'

export type Credential = {
  projectId: string
  /**
   * authenticated by Firebase Authentication or Google OAuth
   */
  token?: string | undefined
}

export type FirestoreOption = {
  fetch?: typeof fetch
}

export interface Firestore extends Record<string, unknown> {
  readonly path: string
  readonly credential: Credential
}

export function firestore(credential: Credential, option?: FirestoreOption): Firestore {
  const root = `https://firestore.googleapis.com/v1/projects/${credential.projectId}/databases/(default)/documents`
  const fetcher = option && option.fetch ? option.fetch : fetch
  return {
    get path(): string {
      return root
    },
    get credential(): Credential {
      return credential
    },
    get fetch(): typeof fetch {
      return fetcher
    },
  }
}

export interface Reference<T extends JsonDocument = JsonDocument> extends Record<string, unknown> {
  readonly path: string
  readonly id: string
  readonly firestore: Firestore
  readonly parent: Reference<T>
  /**
   * @param options {ConvertOptions}
   */
  withConverter: <T>(options?: ConvertOptions<T>) => Reference<T>
}

export type ConvertOptions<T = JsonDocument> = {
  /**
   * convert fetched data to something in client
   */
  from?: FromConverter<T>
  /**
   * convert data to something in client before data sent
   */
  to?: ToConverter<T>
}

export function reference<T = JsonDocument>(
  firestore: Firestore,
  path: string,
  ...paths: string[]
): Reference<T> {
  let p = firestore.path
  if (path.startsWith('/')) p += path
  else p += `/${path}`

  if (paths.length > 0) p += '/' + paths.join('/')

  const ps = p.split('/')
  const id = ps[ps.length - 1]

  let opt: ConvertOptions<JsonDocument>

  return {
    get path(): string {
      return p
    },
    get id(): string {
      return id
    },
    get firestore(): Firestore {
      return firestore
    },
    get parent() {
      return reference(firestore, ps[ps.length - 2])
    },
    withConverter<T = JsonDocument>(options: ConvertOptions<T>) {
      opt = options
      return this
    },
    get options() {
      return opt
    },
  }
}
