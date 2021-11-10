import {
  writeBuilder,
  increment,
  serverTimestamp,
  append,
  remove,
  minimum,
  maximum,
} from '../src/write'
import type { Write } from '../src/write'
import { firestore, reference } from '../src/reference'

describe('write', () => {
  describe('buildWrite', () => {
    it('return for delete', () => {
      const fs = firestore({ projectId: 'project' }, { fetch: jest.fn() })
      const ref = reference(fs, 'collection', 'document')
      const { writes } = writeBuilder().delete(ref).build()

      expect(writes).toEqual([
        { delete: 'projects/project/databases/(default)/documents/collection/document' } as Write,
      ])
    })

    it('return for transform', () => {
      const fs = firestore({ projectId: 'project' }, { fetch: jest.fn() })
      const ref = reference(fs, 'collection', 'document')
      const { writes } = writeBuilder()
        .update(ref, {
          countInt: increment(1),
          countDouble: increment(1.1),
          timestamp: serverTimestamp(),
          arrayNum: append(1, 2, 3),
          arrayStr: remove('1', '2'),
          countMax: maximum(1),
          countMin: minimum(1),
          undefined: undefined,
        })
        .build()

      expect(writes).toEqual([
        {
          transform: {
            document: 'projects/project/databases/(default)/documents/collection/document',
            fieldTransforms: [
              {
                fieldPath: 'countInt',
                increment: { integerValue: 1 },
              },
              {
                fieldPath: 'countDouble',
                increment: { doubleValue: 1.1 },
              },
              {
                fieldPath: 'timestamp',
                setToServerValue: 'REQUEST_TIME',
              },
              {
                fieldPath: 'arrayNum',
                appendMissingElements: {
                  values: [{ integerValue: 1 }, { integerValue: 2 }, { integerValue: 3 }],
                },
              },
              {
                fieldPath: 'arrayStr',
                removeAllFromArray: {
                  values: [{ stringValue: '1' }, { stringValue: '2' }],
                },
              },
              {
                fieldPath: 'countMax',
                maximum: {
                  integerValue: 1,
                },
              },
              {
                fieldPath: 'countMin',
                minimum: {
                  integerValue: 1,
                },
              },
            ],
          },
        } as Write,
      ])
    })

    it('return for update', () => {
      const fs = firestore({ projectId: 'project' }, { fetch: jest.fn() })
      const ref = reference(fs, 'collection', 'document')
      const { writes } = writeBuilder()
        .set(
          ref,
          {
            countInt: increment(1),
            id: 'id',
            map: { name: 'name' },
            array: [1, 2, { map: { name: 'name' } }],
          },
          { merge: true }
        )
        .build()

      expect(writes).toEqual([
        {
          updateMask: { fieldPaths: ['id', 'map', 'array'] },
          updateTransforms: [
            {
              fieldPath: 'countInt',
              increment: { integerValue: 1 },
            },
          ],
          currentDocument: { exists: true },
          update: {
            name: 'projects/project/databases/(default)/documents/collection/document',
            fields: {
              id: {
                stringValue: 'id',
              },
              map: {
                mapValue: {
                  fields: {
                    name: {
                      stringValue: 'name',
                    },
                  },
                },
              },
              array: {
                arrayValue: {
                  values: [
                    {
                      integerValue: 1,
                    },
                    {
                      integerValue: 2,
                    },
                    {
                      mapValue: {
                        fields: {
                          map: {
                            mapValue: {
                              fields: {
                                name: {
                                  stringValue: 'name',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        } as Write,
      ])
    })
  })
})
