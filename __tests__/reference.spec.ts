import { firestore, reference } from '../src/reference'

describe('reference', () => {
  describe('refefrence', () => {
    const fs = firestore({ projectId: 'project' }, { fetch: jest.fn() })

    it.each([
      { ref: reference(fs, '/collection/document') },
      { ref: reference(fs, 'collection', 'document') },
      { ref: reference(fs, 'collection/document') },
    ])('create refefence', ({ ref }) => {
      expect(ref.id).toEqual('document')
      expect(ref.parent.id).toEqual('collection')
    })
  })
})
