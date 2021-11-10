import { firestore, reference } from '../src/reference'

describe('reference', () => {
  describe('refefrence', () => {
    it('create reference', () => {
      const fs = firestore({ projectId: 'project' }, { fetch: jest.fn() })

      const ref = reference(fs, 'collection', 'document')

      expect(ref.id).toEqual('document')
      expect(ref.parent.id).toEqual('collection')
    })
  })
})
