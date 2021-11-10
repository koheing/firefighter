import { buildQuery, Cursor, limit, offset, orderBy, Query, where } from '../src/query'
import { start, end } from '../src/query'
import { firestore, reference } from '../src/reference'

describe('query', () => {
  describe('start', () => {
    it('build start query', () => {
      let cursor: Cursor
      let element = start('from', 1, 'a') as unknown as { detail: Cursor }
      cursor = element.detail

      expect(cursor).toEqual({
        values: [{ integerValue: 1 }, { stringValue: 'a' }],
        before: true,
      } as Cursor)

      element = start('after', 1, 'a') as unknown as { detail: Cursor }
      cursor = element.detail

      expect(cursor).toEqual({
        values: [{ integerValue: 1 }, { stringValue: 'a' }],
        before: false,
      } as Cursor)
    })
  })

  describe('end', () => {
    it('build end query', () => {
      let cursor: Cursor
      let element = end('before', 1, 'a') as unknown as { detail: Cursor }
      cursor = element.detail

      expect(cursor).toEqual({
        values: [{ integerValue: 1 }, { stringValue: 'a' }],
        before: true,
      } as Cursor)

      element = end('to', 1, 'a') as unknown as { detail: Cursor }
      cursor = element.detail

      expect(cursor).toEqual({
        values: [{ integerValue: 1 }, { stringValue: 'a' }],
        before: false,
      } as Cursor)
    })
  })

  describe('buildQuery', () => {
    it('build query if multi where', () => {
      const fs = firestore({ projectId: 'projectId' }, { fetch: jest.fn() })
      const c = reference(fs, 'collection')
      const query = buildQuery(
        c,
        [
          where('id', '==', 'id'),
          where('count', '>=', 10),
          orderBy('id'),
          orderBy('count', 'desc'),
          start('from', 'id'),
          end('before', 10),
          limit(1),
          offset(1),
        ],
        ['count', 'id']
      )

      expect(query).toEqual({
        structuredQuery: {
          select: { fields: [{ fieldPath: 'count' }, { fieldPath: 'id' }] },
          from: [{ collectionId: 'collection', allDescendants: false }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: 'id' },
                    op: 'EQUAL',
                    value: { stringValue: 'id' },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: 'count' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { integerValue: 10 },
                  },
                },
              ],
            },
          },
          orderBy: [
            { field: { fieldPath: 'id' }, direction: 'ASCENDING' },
            { field: { fieldPath: 'count' }, direction: 'DESCENDING' },
          ],
          startAt: {
            values: [{ stringValue: 'id' }],
            before: true,
          },
          endAt: {
            values: [{ integerValue: 10 }],
            before: true,
          },
          limit: 1,
          offset: 1,
        },
      } as Query)
    })

    it('build query if single where', () => {
      const fs = firestore({ projectId: 'projectId' }, { fetch: jest.fn() })
      const c = reference(fs, 'collection')
      const query = buildQuery(c, [
        where('id', '==', 'id'),
        orderBy('id'),
        orderBy('count', 'desc'),
        start('from', 'id'),
        end('before', 10),
        limit(1),
        offset(1),
      ])

      expect(query).toEqual({
        structuredQuery: {
          from: [{ collectionId: 'collection', allDescendants: false }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'id' },
              op: 'EQUAL',
              value: { stringValue: 'id' },
            },
          },
          orderBy: [
            { field: { fieldPath: 'id' }, direction: 'ASCENDING' },
            { field: { fieldPath: 'count' }, direction: 'DESCENDING' },
          ],
          startAt: {
            values: [{ stringValue: 'id' }],
            before: true,
          },
          endAt: {
            values: [{ integerValue: 10 }],
            before: true,
          },
          limit: 1,
          offset: 1,
        },
      } as Query)
    })
  })

  it('throw error if start called', () => {
    const fs = firestore({ projectId: 'projectId' }, { fetch: jest.fn() })
    const c = reference(fs, 'collection')

    try {
      buildQuery(c, [
        where('id', '==', 'id'),
        orderBy('id'),
        start('from', 'id'),
        start('after', 'count'),
      ])
    } catch (e) {
      expect(e.message).toBe('start can only be used once on the same query.')
    }
  })

  it('throw error if end called twice', () => {
    const fs = firestore({ projectId: 'projectId' }, { fetch: jest.fn() })
    const c = reference(fs, 'collection')

    try {
      buildQuery(c, [
        where('id', '==', 'id'),
        orderBy('id'),
        end('before', 'id'),
        end('to', 'count'),
      ])
    } catch (e) {
      expect(e.message).toBe('end can only be used once on the same query.')
    }
  })
})
