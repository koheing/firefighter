# firefighter
[![test](https://github.com/koheing/firefighter/actions/workflows/ci.yml/badge.svg)](https://github.com/koheing/firefighter/actions/workflows/ci.yml)

firefighter is [Firestore](https://firebase.google.com/docs/firestore) REST API wrapper library worked on [@sveltejs/kit](https://kit.svelte.dev/docs) + [Cloudflare Workers](https://workers.cloudflare.com/).  
This library can write/read firestore with set JWT (and **fetch** function) authenticated by Firebase Authentication or Google OAuth.

## why

[Official Firestore library](https://github.com/firebase/firebase-js-sdk) is awesome library, but currently , in 2021-11-10, cannot work on [Loading](https://kit.svelte.dev/docs#loading) and [Endpoints](https://kit.svelte.dev/docs#routing-endpoints) of [@sveltejs/kit](https://kit.svelte.dev/docs) + Cloudflare Workers.  
So, I made this library.

## feature

- get
- list
- runQuery
- patch (set, update, delete)
- createDocument
- commit (batch, transaction)

## install

```
npm install firefighter
```

## imporant

- **[gRPC Listen](https://cloud.google.com/firestore/docs/reference/rpc/google.firestore.v1#google.firestore.v1.ListenRequest) (called onSnapshot function in official firestore library) is not supported**
- It is not recommended to have a firestore instance globally as the Firestore objects in this library do not automatically update the JWT.

# usage

## get

```typescript
import { firestore, reference, from } from 'firefighter'
import type { FromConverter } from 'firefighter'

const token = 'eyJhbGciOiJSUzI...'

const fs = firestore({ projectId: 'projectId', token }, { fetch: fetch } /* option */)
const ref = reference(fs, 'collection', 'document')
const convert: FromConverter = (result) => ({ id: result.id, ...result.toJson() })

const result = await from(ref, { convert, picks: ['documentProperty'] } /* option */).find()
console.log(result.toJson())
```

## list

```typescript
import { firestore, reference, from } from 'firefighter'
import type { FromConverter } from 'firefighter'

const token = 'eyJhbGciOiJSUzI...'

const fs = firestore({ projectId: 'projectId', token }, { fetch: fetch } /* option */)
const ref = reference(fs, 'collection')
const convert: FromConverter = (result) => ({ id: result.id, ...result.toJson() })

const result = await from(ref, { convert, picks: ['documentProperty'] } /* option */).findAll()
console.log(result.toList())
```

## runQuery

```typescript
import { firestore, reference, from, where, offset } from 'firefighter'
import type { FromConverter } from 'firefighter'

const token = 'eyJhbGciOiJSUzI...'

const fs = firestore({ projectId: 'projectId', token }, { fetch: fetch } /* option */)
const ref = reference(fs, 'collection')

const convert: FromConverter = (result) => ({ id: result.id, ...result.toJson() })

const { query, groupQuery } = await from(ref, { convert, picks: ['documentProperty'] } /* option */)

let result = await query(where('count', '>', 1), offset(10))
console.log(result.toList())

let result = await groupQuery(where('count', '>', 1), offset(10))
console.log(result.toList())
```

## patch(set, update, delete)

```typescript
import { firestore, reference, on, increment } from 'firefighter'
import type { ToConverter } from 'firefighter'

const token = 'eyJhbGciOiJSUzI...'

const fs = firestore({ projectId: 'projectId', token }, { fetch: fetch } /* option */)
const ref = reference(fs, 'collection', 'document')

const convert: ToConverter = (data: { id: string; name: string; count: number }) => ({
  name: data.name,
  count: data.count,
})

const data = { id: 'document', name: 'user', count: 1 }
const { set, update, delete: del } = on(ref, { convert } /* option */)
await set(data)
await update({ count: increment(1) })
await del()
```

## createDocument

```typescript
import { firestore, reference, on } from 'firefighter'
import type { ToConverter } from 'firefighter'

const token = 'eyJhbGciOiJSUzI...'

const fs = firestore({ projectId: 'projectId', token }, { fetch: fetch } /* option */)
const ref = reference(fs, 'collection')

const convert: ToConverter = (data: { id: string; name: string; count: number }) => ({
  name: data.name,
  count: data.count,
})

const data = { id: 'document', name: 'user', count: 1 }
const documentId = await on(ref, { convert } /* option */).create(data)
```

## commit (batch, transaction)

```typescript
import { firestore, reference, batcher, transactor } from 'firefighter'

const token = 'eyJhbGciOiJSUzI...'

const fs = firestore({ projectId: 'projectId', token }, { fetch: fetch } /* option */)
const batch = batcher(fs)

batch.set(reference(fs, 'collection', 'document'), { name: 'user', count: 1 })
batch.update(reference(fs, 'collection', 'document'), { count: 2 })
batch.delete(reference(fs, 'collection', 'document'))

await batch.commit()

await transactor(fs).run(async (t) => {
  const ref = reference(fs, 'collection', 'document')
  const result = await t.get(ref)
  if (!result.toJson()) {
    throw new Error('error')
  }

  t.set(ref, { count: result.toJson().count + 1 })
})
```
