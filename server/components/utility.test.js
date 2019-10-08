const { validateUrl, getSendGridObject, padWithZeros } = require('./utility.js')

describe('Validate url test in utility', () => {
  test('should validate correct Urls', () => {
    expect(validateUrl('https://www.yahoo.com')).toBe(true)
    expect(validateUrl('https://app.yahoo.com')).toBe(true)
    expect(validateUrl('https://socket.io')).toBe(true)
  })
  test('should invalidate incorrect Urls', () => {
    expect(validateUrl('https:/app.yahoo.com')).toBe(false)
    expect(validateUrl('htt://app.yahoo.com')).toBe(false)
    expect(validateUrl('https://appcom')).toBe(false)
  })
})

describe('Get SendGrid Object in utility', () => {
  test('should get send grid object', () => {
    const sendGrid = getSendGridObject()
    expect(sendGrid).toBeDefined()
    expect(sendGrid).toBeInstanceOf(Object)
  })
})

describe('Pad with zeros function', () => {
  test('should pad a number with zeros correctly', () => {
    expect(padWithZeros(4, 2)).toBe("04")
    expect(padWithZeros(4, 3)).toBe("004")
    expect(padWithZeros(14, 2)).toBe("14")
  })
})
