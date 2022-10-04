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

export interface Reference {
  readonly path: string
  readonly id: string
  readonly firestore: Firestore
  readonly parent: Reference
}

export function reference(firestore: Firestore, path: string, ...paths: string[]): Reference {
  let p = firestore.path
  if (path.startsWith('/')) p += path
  else p += `/${path}`

  if (paths.length > 0) p += '/' + paths.join('/')

  const ps = p.split('/')
  const id = ps[ps.length - 1]
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
  }
}
