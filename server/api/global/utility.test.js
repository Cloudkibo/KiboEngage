const { prepareSubscribersCriteria } = require('./utility.js')

describe('Validate prepareSubscribersCriteria in global/utility', () => {
  test('validate undefined body', () => {
    expect(() => {
      prepareSubscribersCriteria(undefined, {_id: 1})
    }).toThrowError(Error('body is required and cannot be empty!'))
  })

  test('validate empty body', () => {
    expect(() => {
      prepareSubscribersCriteria({}, {_id: 1})
    }).toThrowError(Error('body is required and cannot be empty!'))
  })

  test('validate undefined page', () => {
    expect(() => {
      prepareSubscribersCriteria({isList: true})
    }).toThrowError(Error('page is required and cannot be empty!'))
  })

  test('validate empty page', () => {
    expect(() => {
      prepareSubscribersCriteria({isList: true}, {})
    }).toThrowError(Error('page is required and cannot be empty!'))
  })

  test('validate undefined lists when isList is true', () => {
    expect(() => {
      prepareSubscribersCriteria({isList: true}, {_id: 1})
    }).toThrowError(Error('lists is required and cannot be empty!'))
  })

  test('validate empty lists when isList is true', () => {
    expect(() => {
      prepareSubscribersCriteria({isList: true}, {_id: 1}, [])
    }).toThrowError(Error('lists is required and cannot be empty!'))
  })

  let body = {
    segmentationGender: ['male'],
    segmentationLocale: ['en_US']
  }

  let page = {
    _id: 1,
    companyId: 'cid'
  }

  test('test with segmented true', () => {
    const result = prepareSubscribersCriteria(Object.assign(body, {isSegmented: true}), page, lists)
    const expectedObject = {
      pageId: 1,
      companyId: 'cid',
      isSubscribed: true,
      gender: {$in: ['male']},
      locale: {$in: ['en_US']}
    }
    expect(result).toMatchObject(expectedObject)
  })

  let lists = [{content: ['sub1', 'sub2']}, {content: ['sub2', 'sub3']}]

  test('test with isList true', () => {
    const result = prepareSubscribersCriteria(Object.assign(body, {isList: true}), page, lists)
    const expectedObject = {
      pageId: 1,
      companyId: 'cid',
      isSubscribed: true,
      _id: {$in: ['sub1', 'sub2', 'sub3']}
    }
    expect(result).toMatchObject(expectedObject)
  })
})
