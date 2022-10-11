import { firestore, reference } from '../src/reference'
import { buildRequestParameters } from '../src/request'

describe('buildRequestParameters', () => {
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

  describe('forFind', () => {
    it('build url with mask query and transaction', () => {
      const ref = reference(fs, 'collection', 'document')
      const [url] = buildRequestParameters(fs, 'transactionId').forFind(ref, {
        picks: ['id', 'name'],
      })

      expect(url).toEqual(
        `https://firestore.googleapis.com/v1/projects/project/databases/(default)/documents/collection/document?transaction=transactionId&mask.fieldPaths=id&mask.fieldPaths=name`
      )
    })

    it('build url without mask query and transaction', () => {
      const ref = reference(fs, 'collection', 'document')
      const [url] = buildRequestParameters(fs).forFind(ref)

      expect(url).toEqual(
        `https://firestore.googleapis.com/v1/projects/project/databases/(default)/documents/collection/document`
      )
    })
  })

  describe('forFindAll', () => {
    it('build url with mask query and transaction', () => {
      const ref = reference(fs, 'collection', 'document')
      const [url] = buildRequestParameters(fs, 'transactionId').forFindAll(ref, {
        picks: ['id', 'name'],
      })

      expect(url).toEqual(
        `https://firestore.googleapis.com/v1/projects/project/databases/(default)/documents/collection/document?transaction=transactionId&mask.fieldPaths=id&mask.fieldPaths=name`
      )
    })

    it('build url without mask query and transaction', () => {
      const ref = reference(fs, 'collection', 'document')
      const [url] = buildRequestParameters(fs).forFindAll(ref)

      expect(url).toEqual(
        `https://firestore.googleapis.com/v1/projects/project/databases/(default)/documents/collection/document`
      )
    })
  })
})
