const { prepareChat } = require('./whatsAppBroadcasts.logiclayer.js')

describe('Validate prepareChat in whatsapp logic layer', () => {
  test('should return an object', () => {
    let payload = {componentType: 'text', text: 'hi'}
    let companyUser = {
      companyId: {
        _id: '123',
        twilioWhatsApp: {sandboxNumber: '+123'}}
    }
    let contact = {
      _id: '5abc',
      number: '+923322'
    }
    let output = {
      senderNumber: '+123',
      recipientNumber: '+923322',
      contactId: '5abc',
      companyId: '123',
      payload: {componentType: 'text', text: 'hi'}
    }
    expect(prepareChat(payload, companyUser, contact)).toEqual(output)
  })
  test('should return an error', () => {
    let payload = {'componentType': 'text', text: 'hi'}
    let companyUser = {
      companyId: {
        _id: '123',
        twilioWhatsApp: {}}
    }
    let contact = {
      _id: '5abc',
      number: '+923322'
    }
    expect(() => { prepareChat(payload, companyUser, contact) }).toThrowError(Error('company payload should be valid'))
  })
  test('should return an error', () => {
    let payload = {text: 'hi'}
    let companyUser = {
      companyId: {
        _id: '123',
        twilioWhatsApp: {sandboxNumber: '+123'}}
    }
    let contact = {
      _id: '5abc',
      number: '+923322'
    }
    expect(() => { prepareChat(payload, companyUser, contact) }).toThrowError(Error('payload should be defined'))
  })
  test('should return an error', () => {
    let payload = {text: 'hi'}
    let companyUser = {
      companyId: {
        _id: '123',
        twilioWhatsApp: {}}
    }
    let contact = {
      number: '+923322'
    }
    expect(() => { prepareChat(payload, companyUser, contact) }).toThrowError(Error('contact payload should contain _id and number as parameters and should be valid payload'))
  })
})
