const { prepareSubscribersCriteria, isEmailAddress, isWebURL, isNumber, isPhoneNumber } = require('./utility.js')

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

describe('Validate email test in utility', () => {
  test('should validate correct Urls', () => {
    expect(isEmailAddress('dummy@gmail.com')).toBe(true)
    expect(isEmailAddress('dummy@hotmail.com')).toBe(true)
    expect(isEmailAddress('dummy@yahoo.com')).toBe(true)
  })
  test('should invalidate email', () => {
    expect(isEmailAddress('gmail.com')).toBe(false)
    expect(isEmailAddress('dummy@gmail')).toBe(false)
    expect(isEmailAddress('dummy@com')).toBe(false)
  })
})
describe('Validate weburl test in utility', () => {
  test('should validate correct Urls', () => {
    expect(isWebURL('www.google.com')).toBe(true)
    expect(isWebURL('google.com')).toBe(true)
    expect(isWebURL('https://app.yahoo.com')).toBe(true)
  })
  test('should invalidate weburl', () => {
    expect(isWebURL('htt://app.yahoo.com')).toBe(false)
    expect(isWebURL('https://appcom')).toBe(false)
  })
})

describe('Validate Number test in utility', () => {
  test('should validate correct Number', () => {
    expect(isNumber('034030')).toBe(true)
    expect(isNumber('12345')).toBe(true)
    expect(isNumber('98765')).toBe(true)
  })
  test('should invalidate Number', () => {
    expect(isNumber('no')).toBe(false)
    expect(isNumber('+92340')).toBe(false)
  })
})

describe('Validate PhoneNumber test in utility', () => {
  test('should validate correct PhoneNumber', () => {
    expect(isPhoneNumber('+923403630780')).toBe(true)
    expect(isPhoneNumber('03403630780')).toBe(true)
    expect(isPhoneNumber('123-345-3456')).toBe(true)
  })
  test('should invalidate PhoneNumber', () => {
    expect(isPhoneNumber('number')).toBe(false)
    expect(isPhoneNumber('1234')).toBe(false)
    expect(isPhoneNumber('+92340')).toBe(false)

  })
})
