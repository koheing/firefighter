import { from, on, batcher, transactor } from '../src/service'
import { reference, firestore } from '../src/reference'
import { where } from '../src/query'

jest.mock('../src/id', () => ({
  documentId: () => 'documentId',
}))

describe('service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('from', () => {
    describe('find', () => {
      it('get documentresult if document existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                name: 'collection/document',
                fields: {
                  subId: {
                    stringValue: 'subId',
                  },
                  name: {
                    stringValue: 'name',
                  },
                },
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection', 'document').withConverter({
          from: (it) => ({ id: it.id, name: it.toJson().name, subId: it.toJson().subId }),
        })
        const result = await from(ref).find()

        expect(result.toJson()).toEqual({ id: 'document', name: 'name', subId: 'subId' })
      })
    })

    it('get documentresult if 404 error occured', async () => {
      const fetchMock = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              error: {
                code: 404,
                message: 'data not found',
              },
            }),
        })
      )

      const fs = firestore(
        { projectId: 'project', token: 'token' },
        { fetch: fetchMock as unknown as typeof fetch }
      )

      const ref = reference(fs, 'collection', 'document')

      const result = await from(ref).find()

      expect(result.id).toBeUndefined()
      expect(result.toJson()).toBeUndefined()
    })

    it('throw error if error occured, except 404', async () => {
      const fetchMock = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve([
              {
                error: {
                  code: 400,
                  message: 'bad request',
                },
              },
            ]),
        })
      )

      const fs = firestore(
        { projectId: 'project', token: 'token' },
        { fetch: fetchMock as unknown as typeof fetch }
      )

      const ref = reference(fs, 'collection', 'document')

      try {
        await from(ref).find()
      } catch (e) {
        expect(e).not.toBeUndefined()
      }
    })

    describe('findAll', () => {
      it('get collectionresult if collection existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                documents: [
                  {
                    name: 'collection/document',
                    fields: {
                      subId: {
                        stringValue: 'subId',
                      },
                      name: {
                        stringValue: 'name',
                      },
                    },
                  },
                ],
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project', token: 'token' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref, {
          convert: (result) => ({
            id: result.id,
            name: result.toJson()?.name,
            subId: result.toJson()?.subId,
          }),
        }).findAll()

        expect(result.length).toEqual(1)
        expect(result.toList()).toEqual([{ id: 'document', name: 'name', subId: 'subId' }])
      })

      it('get collectionresult if collection not existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).findAll()

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get collectionresult if collection existed but empty', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                documents: [{ name: 'collection/document' }],
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).findAll()

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get collectionresult if 404 error occured', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: {
                  code: 404,
                  message: 'not found',
                },
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).findAll()

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('throw error if error occured, except 404', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve([
                {
                  error: {
                    code: 401,
                    message: 'unauthorized',
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        try {
          await from(ref).findAll()
        } catch (e) {
          expect(e).not.toBeUndefined()
        }
      })
    })

    describe('query', () => {
      it('get queryresult if query result existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  document: {
                    name: 'collection/document',
                    fields: {
                      subId: {
                        stringValue: 'subId',
                      },
                      name: {
                        stringValue: 'name',
                      },
                    },
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project', token: 'token' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')
        const result = await from(ref, {
          convert: (result) => ({
            id: result.id,
            name: result.toJson()?.name,
            subId: result.toJson()?.subId,
          }),
        }).query(where('id', '==', 'id'))

        expect(result.length).toEqual(1)
        expect(result.toList()).toEqual([{ id: 'document', name: 'name', subId: 'subId' }])
      })

      it('get queryresult if query result not existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).query(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get queryresult if query result existed but empty', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'collection/document' }]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).query(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get collectionresult if 404 error occured', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: {
                  code: 404,
                  message: 'data not found',
                },
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).query(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('throw error if error occured, except 404', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve([
                {
                  error: {
                    code: 401,
                    message: 'unauthorized',
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        try {
          await from(ref).query(where('id', '==', 'id'))
        } catch (e) {
          expect(e).not.toBeUndefined()
        }
      })
    })

    describe('queryAll', () => {
      it('get queryresult if queryAll result existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  document: {
                    name: 'collection/document',
                    fields: {
                      subId: {
                        stringValue: 'subId',
                      },
                      name: {
                        stringValue: 'name',
                      },
                    },
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project', token: 'token' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')
        const result = await from(ref, {
          convert: (result) => ({
            id: result.id,
            name: result.toJson()?.name,
            subId: result.toJson()?.subId,
          }),
        }).queryAll(where('id', '==', 'id'))

        expect(result.length).toEqual(1)
        expect(result.toList()).toEqual([{ id: 'document', name: 'name', subId: 'subId' }])
      })

      it('get queryresult if queryAll result not existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).queryAll(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get queryresult if queryAll result existed but empty', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'collection/document' }]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).queryAll(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get collectionresult if 404 error occured', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: {
                  code: 404,
                  message: 'data not found',
                },
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).queryAll(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('throw error if error occured, except 404', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve([
                {
                  error: {
                    code: 401,
                    message: 'unauthorized',
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        try {
          await from(ref).queryAll(where('id', '==', 'id'))
        } catch (e) {
          expect(e).not.toBeUndefined()
        }
      })
    })

    describe('groupQuery', () => {
      it('get queryresult if queryAll result existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  document: {
                    name: 'collection/document',
                    fields: {
                      subId: {
                        stringValue: 'subId',
                      },
                      name: {
                        stringValue: 'name',
                      },
                    },
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project', token: 'token' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')
        const result = await from(ref, {
          convert: (result) => ({
            id: result.id,
            name: result.toJson()?.name,
            subId: result.toJson()?.subId,
          }),
        }).groupQuery(where('id', '==', 'id'))

        expect(result.length).toEqual(1)
        expect(result.toList()).toEqual([{ id: 'document', name: 'name', subId: 'subId' }])
      })

      it('get queryresult if queryAll result not existed', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).groupQuery(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get queryresult if queryAll result existed but empty', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ name: 'collection/document' }]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).groupQuery(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('get collectionresult if 404 error occured', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: {
                  code: 404,
                  message: 'data not found',
                },
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        const result = await from(ref).groupQuery(where('id', '==', 'id'))

        expect(result.length).toEqual(0)
        expect(result.toList()).toEqual([])
      })

      it('throw error if error occured, except 404', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve([
                {
                  error: {
                    code: 401,
                    message: 'unauthorized',
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        try {
          await from(ref).groupQuery(where('id', '==', 'id'))
        } catch (e) {
          expect(e).not.toBeUndefined()
        }
      })
    })
  })

  describe('on', () => {
    describe('create', () => {
      it('create document', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(),
          })
        )

        const fs = firestore(
          { projectId: 'project', token: 'token' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')
        const docId = await on(ref, {
          convert: (data) => ({ id: data.id, name: data.name, subId: data.subId }),
        }).create({ id: 'id', name: 'name', subId: 'subId' })

        expect(docId).toEqual('documentId')
      })

      it('throw error if error occured', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: {
                  code: 401,
                  message: 'unauthorized',
                },
              }),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        try {
          await on(ref).create({ id: 'id', name: 'name', subId: 'subId' })
        } catch (e) {
          expect(e).not.toBeUndefined()
        }
      })

      it('throw first error if multiple error occured', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve([
                {
                  error: {
                    code: 400,
                    message: 'bad request',
                  },
                },
                {
                  error: {
                    code: 401,
                    message: 'unauthorized',
                  },
                },
              ]),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection')

        try {
          await on(ref).create({ id: 'id', name: 'name', subId: 'subId' })
        } catch (e) {
          expect(e).toEqual({
            code: 400,
            message: 'bad request',
          })
        }
      })
    })

    describe('set', () => {
      it('set new document', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(),
          })
        )

        const fs = firestore(
          { projectId: 'project', token: 'token' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection', 'document')

        await on(ref, { convert: (data) => ({ id: data.id, name: data.name }) }).set({
          id: 'id',
          name: 'name',
        })

        expect(fetchMock).toBeCalled()
      })

      it('merge set document', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection', 'document')
        await on(ref).set({ id: 'id', name: 'name' }, { merge: true })

        expect(fetchMock).toBeCalled()
      })
    })

    describe('update', () => {
      it('update document if converter set', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection', 'document')

        await on(ref, { convert: (data) => ({ id: data.id, name: data.name }) }).update({
          id: 'id',
          name: 'name',
        })

        expect(fetchMock).toBeCalled()
      })

      it('update document if converter unset', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection', 'document')

        await on(ref).update({
          id: 'id',
          name: 'name',
        })

        expect(fetchMock).toBeCalled()
      })
    })

    describe('delete', () => {
      it('delete document', async () => {
        const fetchMock = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(),
          })
        )

        const fs = firestore(
          { projectId: 'project' },
          { fetch: fetchMock as unknown as typeof fetch }
        )
        const ref = reference(fs, 'collection', 'document')
        await on(ref).delete()

        expect(fetchMock).toBeCalled()
      })
    })
  })

  describe('batcher', () => {
    it('batch update', async () => {
      const fetchMock = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              writeResults: [{ updateTime: '2021-01-11T00:00:00.000Z' }],
            }),
        })
      )

      const fs = firestore(
        { projectId: 'project' },
        { fetch: fetchMock as unknown as typeof fetch }
      )
      const b = batcher(fs)

      b.delete(reference(fs, 'collection', 'document'))
      b.set(reference(fs, 'collection', 'document'), { name: 'name' })
      b.set(reference(fs, 'collection', 'document2'), { name: 'name' })
      b.update(reference(fs, 'collection', 'document'), { name: 'name1' })

      await b.commit()

      expect(fetchMock).toBeCalled()
    })

    it('throw error if error occured', async () => {
      const fetchMock = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: { code: 401, message: 'unauthorized' } }),
        })
      )

      const fs = firestore(
        { projectId: 'project' },
        { fetch: fetchMock as unknown as typeof fetch }
      )
      const b = batcher(fs)

      b.delete(reference(fs, 'collection', 'document'))
      b.set(
        reference(fs, 'collection', 'document').withConverter<{ name: string }>({ to: (it) => it }),
        { name: 'name' }
      )
      b.update(
        reference(fs, 'collection', 'document').withConverter<{ name: string }>({ to: (it) => it }),
        { name: 'name1' }
      )

      try {
        await b.commit()
      } catch (e) {
        expect(e).not.toBeUndefined()
      }
    })

    it('throw first error if multiple error occured', async () => {
      const fetchMock = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve([
              { error: { code: 400, message: 'bad request' } },
              { error: { code: 401, message: 'unauthorized' } },
            ]),
        })
      )

      const fs = firestore(
        { projectId: 'project' },
        { fetch: fetchMock as unknown as typeof fetch }
      )
      const b = batcher(fs)

      b.delete(reference(fs, 'collection', 'document'))
      b.set(reference(fs, 'collection', 'document'), { name: 'name' })
      b.update(reference(fs, 'collection', 'document'), { name: 'name1' })

      try {
        await b.commit()
      } catch (e) {
        expect(e).toEqual({ code: 400, message: 'bad request' })
      }
    })
  })

  describe('transactor', () => {
    it('transaction succeeded at first attempt', async () => {
      const fetchMock = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              documents: [{ fields: { id: { stringValue: 'id' } } }],
            }),
        })
      )

      const fs = firestore(
        { projectId: 'project' },
        { fetch: fetchMock as unknown as typeof fetch }
      )
      const result = await transactor(fs).run(async (transaction) => {
        transaction.delete(reference(fs, 'collection', 'doc'))
        transaction.set(reference(fs, 'collection', 'doc'), { id: 'id' })
        transaction.update(reference(fs, 'collection', 'doc'), { name: 'name' })
        const result = await transaction.findAll(reference(fs, 'collection', 'document'))
        return result.toList()[0]
      })

      expect(result).toEqual({ id: 'id' })
      expect(fetchMock).toBeCalled()
    })
  })

  it('throw error if maxAttempt over', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              documents: [{ fields: { id: { stringValue: 'id' } } }],
            }),
        })
      )
      .mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              error: { code: 400, message: 'bad request' },
            }),
        })
      )

    const fs = firestore({ projectId: 'project' }, { fetch: fetchMock as unknown as typeof fetch })
    try {
      await transactor(fs).run(
        async (transaction) => {
          const result = await transaction.find(reference(fs, 'collection', 'document'))
          return result.toJson()
        },
        { maxAttempt: 5 }
      )
    } catch (e) {
      expect(e).not.toBeUndefined()
    }
    expect(fetchMock).toBeCalledTimes(6)
  })

  it('throw error if 404 error occured', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              documents: [{ fields: { id: { stringValue: 'id' } } }],
            }),
        })
      )
      .mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve([
              {
                error: { code: 404, message: 'bad request' },
              },
            ]),
        })
      )

    const fs = firestore({ projectId: 'project' }, { fetch: fetchMock as unknown as typeof fetch })
    try {
      await transactor(fs).run(async (transaction) => {
        const result = await transaction.find(reference(fs, 'collection', 'document'))
        return result.toJson()
      })
    } catch (e) {
      expect(e).not.toBeUndefined()
    }
    expect(fetchMock).toBeCalledTimes(2)
  })
})
