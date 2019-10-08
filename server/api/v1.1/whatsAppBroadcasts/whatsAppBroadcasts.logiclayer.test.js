const { prepareChat } = require('./utility.js')

describe('Validate prepareChat', () => {
  test('should return an object', () => {
    let payload = [{componentType: 'text', text: 'hi'}]
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
  test('should throw error', () => {
    let payload = [{componentType: 'text', text: 'hi'}]
    let companyUser = {
      companyId: {
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
    expect(prepareChat(payload, companyUser, contact)).toThrow(TypeError)
  })
})
