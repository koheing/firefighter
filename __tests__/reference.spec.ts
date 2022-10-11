import { firestore, reference } from '../src/reference'

describe('reference', () => {
  const fs = firestore({ projectId: 'project' }, { fetch: jest.fn() })

  it.each([
    { ref: reference(fs, '/collection/document') },
    { ref: reference(fs, 'collection', 'document') },
    { ref: reference(fs, 'collection/document') },
    { ref: reference(fs, 'collection/document').withConverter({ from: (it) => it.id }) },
  ])('create refefence', ({ ref }) => {
    expect(ref.id).toEqual('document')
    expect(ref.parent.id).toEqual('collection')
  })
})
