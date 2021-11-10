import { firestify, jsonify } from '../src/mapper'
import type { FirestoreDocument, JsonDocument } from '../src/model'

describe('mapper', () => {
  describe('jsonify', () => {
    it('convert firestore document to json', () => {
      const value: Pick<FirestoreDocument, 'fields'> = {
        fields: {
          a: {
            nullValue: null,
          },
          b: {
            integerValue: 1,
          },
          c: {
            stringValue: 'c',
          },
          d: {
            arrayValue: {
              values: [
                {
                  mapValue: {
                    fields: {
                      d1: {
                        mapValue: {
                          fields: {
                            d1i: {
                              doubleValue: 0.1,
                            },
                            d1ii: {
                              stringValue: 'd1ii',
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  integerValue: 1,
                },
              ],
            },
          },
          e: {
            timestampValue: '2021-10-25T22:49:25.790Z',
          },
          f: {
            timestampValue: '2021-10-25T22:49:25.790Z',
          },
          g: {
            geoPointValue: { longitude: 0, latitude: 0 },
          },
          h: {
            booleanValue: true,
          },
          i: {
            arrayValue: {},
          },
        },
      }

      const result = jsonify(value)

      expect(result).toEqual({
        a: null,
        b: 1,
        c: 'c',
        d: [{ d1: { d1i: 0.1, d1ii: 'd1ii' } }, 1],
        e: '2021-10-25T22:49:25.790Z',
        f: '2021-10-25T22:49:25.790Z',
        g: { longitude: 0, latitude: 0 },
        h: true,
        i: [],
      })
    })
  })

  describe('firestify', () => {
    it('convert json to firestore document', () => {
      const now = 1635202165790
      const value: JsonDocument = {
        a: null,
        b: 1,
        c: 'c',
        d: [{ d1: { d1i: 0.1, d1ii: 'd1ii' } }, 1],
        e: new Date(now),
        f: '2021-10-25T22:49:25.790Z',
        g: { longitude: 0, latitude: 0 },
        h: true,
        i: [],
      }

      const result = firestify(value)

      expect(result).toEqual({
        fields: {
          a: {
            nullValue: null,
          },
          b: {
            integerValue: 1,
          },
          c: {
            stringValue: 'c',
          },
          d: {
            arrayValue: {
              values: [
                {
                  mapValue: {
                    fields: {
                      d1: {
                        mapValue: {
                          fields: {
                            d1i: {
                              doubleValue: 0.1,
                            },
                            d1ii: {
                              stringValue: 'd1ii',
                            },
                          },
                        },
                      },
                    },
                  },
                },
                {
                  integerValue: 1,
                },
              ],
            },
          },
          e: {
            timestampValue: '2021-10-25T22:49:25.790Z',
          },
          f: {
            timestampValue: '2021-10-25T22:49:25.790Z',
          },
          g: {
            geoPointValue: { longitude: 0, latitude: 0 },
          },
          h: {
            booleanValue: true,
          },
          i: {
            arrayValue: { values: [] },
          },
        },
      })
    })
  })
})
