const { getCriterias, createPayloadgetSubscribersCount, checkFilterValues } = require('./whatsAppBroadcasts.logiclayer')
const { prepareChat } = require('./whatsAppBroadcasts.logiclayer.js')

describe('Validate getCriterias method for pagaination', () => {
    test( 'should return an error because body is empty', () => {
      expect(() => { getCriterias(null, '12345678') }).toThrowError(Error('body shouldnot be empty'))
    })
    test( 'should return an error because companyId is null', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: '', days: '0'},
      first_page: 'next',
      last_id: '5d9c3027e58f4b3f604b2961',
      number_of_records: 10,
      requested_page:1,
      current_page: 0
    }
      expect(() => { getCriterias(body, null) }).toThrowError(Error('companyUser must contain companyId and should be valid payload'))
    })
  test( 'should return an error because number_of_records is null', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: '', days: '0'},
      first_page: 'next',
      last_id: '5d9c3027e58f4b3f604b2961',
      requested_page:1,
      current_page: 0
    }
      expect(() => { getCriterias(body, '12345678') }).toThrowError(Error('body must contain number_of_records and should be valid payload'))
    })
    test('should give first page countCriterias and fetchCriteria', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: '', days: '0'},
      first_page: 'first',
      last_id: 'none',
      number_of_records: 10
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
     [ { '$match': {
       'companyId': '12345678',
       'datetime': {
         '$exists': true
       }
     }},
     { '$sort': { datetime: -1 } },
     { '$skip': 0 },
     { '$limit': 10 } ] }
    expect(getCriterias(body, companyUser)).toEqual(output)
})
test('should give next page countCriterias and fetchCriteria', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: '', days: '0'},
      first_page: 'next',
      last_id: '5d9c3027e58f4b3f604b2961',
      number_of_records: 10,
      requested_page:1,
      current_page: 0
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
       [ { '$match': {
         'companyId': '12345678',
         '_id': { $lt: '5d9c3027e58f4b3f604b2961' },
         'datetime': {
           '$exists': true
         }
       }},
       { '$sort': { datetime: -1 } },
       { '$skip': 0 },
       { '$limit': 10 } ] }
      expect(getCriterias(body, companyUser)).toEqual(output)

})
test('should give previous page countCriterias and fetchCriteria', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: '', days: '0'},
      first_page: 'previous',
      last_id: '5d9c3027e58f4b3f604b2961',
      number_of_records: 10,
      requested_page:1,
      current_page: 0
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
       [ { '$match': {
         'companyId': '12345678',
         '_id': { $gt: '5d9c3027e58f4b3f604b2961' },
         'datetime': {
           '$exists': true
         }
       }},
       { '$sort': { datetime: -1 } },
       { '$skip': 10 },
       { '$limit': 10 } ] }
      expect(getCriterias(body, companyUser)).toEqual(output)

})
test('should give first page countCriterias and fetchCriteria with miscellaneous component type', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: 'miscellaneous', days: '0'},
      first_page: 'first',
      last_id: 'none',
      number_of_records: 10
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      'payload.1': { $exists: true },
      'title': { $exists: true },
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
     [ { '$match': {
       'companyId': '12345678',
       'payload.1': { $exists: true },
       'title': { $exists: true },
       'datetime': {
         '$exists': true
       },
     }},
     { '$sort': { datetime: -1 } },
     { '$skip': 0 },
     { '$limit': 10 } ] }
    expect(getCriterias(body, companyUser)).toEqual(output)
})

test('should give first page countCriterias and fetchCriteria with media component type', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: 'media', days: '0'},
      first_page: 'first',
      last_id: 'none',
      number_of_records: 10
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      '$and': [{'payload.0.componentType': 'media'}, {'payload.1': { $exists: false }}],
      'title': { $exists: true },
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
     [ { '$match': {
       'companyId': '12345678',
       '$and': [{'payload.0.componentType': 'media'}, {'payload.1': { $exists: false }}],
       'title': { $exists: true },
       'datetime': {
         '$exists': true
       },
     }},
     { '$sort': { datetime: -1 } },
     { '$skip': 0 },
     { '$limit': 10 } ] }
    expect(getCriterias(body, companyUser)).toEqual(output)
})
test('should give first page countCriterias and fetchCriteria with all component type', () => {
    var body = {filter: false,
      filter_criteria: {search_value: '', type_value: 'all', days: '0'},
      first_page: 'first',
      last_id: 'none',
      number_of_records: 10
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      'payload.0.componentType': { $exists: true },
      'title': { $exists: true },
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
     [ { '$match': {
       'companyId': '12345678',
       'payload.0.componentType': { $exists: true },
       'title': { $exists: true },
       'datetime': {
         '$exists': true
       },
     }},
     { '$sort': { datetime: -1 } },
     { '$skip': 0 },
     { '$limit': 10 } ] }
    expect(getCriterias(body, companyUser)).toEqual(output)
})
test('should give first page countCriterias and fetchCriteria with miscellaneous component type and title', () => {
    var body = {filter: false,
      filter_criteria: {search_value: 'testing', type_value: 'miscellaneous', days: '0'},
      first_page: 'first',
      last_id: 'none',
      number_of_records: 10
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      'payload.1': { $exists: true },
      'title': {
        '$regex': 'testing'
      },
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
     [ { '$match': {
       'companyId': '12345678',
       'payload.1': { $exists: true },
       'title': {
         '$regex': 'testing'
       },
       'datetime': {
         '$exists': true
       },
     }},
     { '$sort': { datetime: -1 } },
     { '$skip': 0 },
     { '$limit': 10 } ] }
    expect(getCriterias(body, companyUser)).toEqual(output)
})
test('should give first page countCriterias and fetchCriteria with media component type and title', () => {
    var body = {filter: false,
      filter_criteria: {search_value: 'testing', type_value: 'media', days: '0'},
      first_page: 'first',
      last_id: 'none',
      number_of_records: 10
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      '$and': [{'payload.0.componentType': 'media'}, {'payload.1': { $exists: false }}],
      'title': {
        '$regex': 'testing'
      },
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
     [ { '$match': {
       'companyId': '12345678',
       '$and': [{'payload.0.componentType': 'media'}, {'payload.1': { $exists: false }}],
       'title': {
         '$regex': 'testing'
       },
       'datetime': {
         '$exists': true
       },
     }},
     { '$sort': { datetime: -1 } },
     { '$skip': 0 },
     { '$limit': 10 } ] }
    expect(getCriterias(body, companyUser)).toEqual(output)
})
test('should give first page countCriterias and fetchCriteria with all component type and title', () => {
    var body = {filter: false,
      filter_criteria: {search_value: 'testing', type_value: 'all', days: '0'},
      first_page: 'first',
      last_id: 'none',
      number_of_records: 10
    }
    var companyUser = {
      companyId: '12345678'
    }
    var output = { countCriteria: [ { '$match': {
      'companyId': '12345678',
      'payload.0.componentType': { $exists: true },
      'title': {
        '$regex': 'testing'
      },
      'datetime': {
        '$exists': true
      },
}},
    { '$group': {
      '_id': null,
      'count':{
        '$sum': 1
      }
    }
    } ],
    fetchCriteria:
     [ { '$match': {
       'companyId': '12345678',
       'payload.0.componentType': { $exists: true },
       'title': {
         '$regex': 'testing'
       },
       'datetime': {
         '$exists': true
       },
     }},
     { '$sort': { datetime: -1 } },
     { '$skip': 0 },
     { '$limit': 10 } ] }
    expect(getCriterias(body, companyUser)).toEqual(output)
})
})

describe('Get Payload of get subscribers count method', () => {
  test('return payload', () => {
    let finalFindCriteria = {
      companyId: '12345678',
      senderNumber: '+923403630780',
      format: 'twilio'
    }
    var output = {
      purpose: 'aggregate',
      match: finalFindCriteria,
      sort: {datetime: -1},
      limit: 1
      }
    expect(createPayloadgetSubscribersCount('12345678', '+923403630780')).toEqual(output)
  })
})

describe('createPayloadgetSubscribersCount method testing', () => {
  test('return payload which used in get subscriber count method', () => {
    let finalFindCriteria = {
      companyId: '12345678',
      senderNumber: '+923403630780',
      format: 'twilio'
    }
    var output = {
      purpose: 'aggregate',
      match: finalFindCriteria,
      sort: {datetime: -1},
      limit: 1
      }
    expect(createPayloadgetSubscribersCount('12345678', '+923403630780')).toEqual(output)
  })
  test('return error because companyID is missing', () => {
    let finalFindCriteria = {
      companyId: '12345678',
      senderNumber: '+923403630780',
      format: 'twilio'
    }
    var output = {
      purpose: 'aggregate',
      match: finalFindCriteria,
      sort: {datetime: -1},
      limit: 1
      }
      expect(() => { createPayloadgetSubscribersCount(null, '+923403630780') }).toThrowError(Error('must contain companyId and should be valid payload'))

  })
  test('return error because contact no is missing', () => {
    let finalFindCriteria = {
      companyId: '12345678',
      senderNumber: '+923403630780',
      format: 'twilio'
    }
    var output = {
      purpose: 'aggregate',
      match: finalFindCriteria,
      sort: {datetime: -1},
      limit: 1
      }
      expect(() => { createPayloadgetSubscribersCount('123456789', null) }).toThrowError(Error('must contain contact number and should be valid payload'))

  })
})

describe('checkFilterValues method testing', () => {
  test('return true because segmentation is null ', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
  }
    expect(checkFilterValues(null, contact)).toEqual(true)
  })
  test('return true because segmentation length is zero ', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
  }
    expect(checkFilterValues(null, contact)).toEqual(true)
  })
  test('return false because name doesnot exist in contact', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }

    var values = [{
      criteria: 'is',
      text: 'Arveen Kumar',
      condition: 'name'
    }]
      expect(checkFilterValues(values, contact)).toEqual(false)
    })
    test('return false because name exist in contact', () => {
    var contact = {
      'name': 'Arveen Kumar',
      'number': '+923403630780'
    }

    var values = [{
      criteria: 'is',
      text: 'Arveen Kumar',
      condition: 'name'
    }]
      expect(checkFilterValues(values, contact)).toEqual(true)
    })
  test('return false because name doesnot exist in contact', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }

    var values = [{
      criteria: 'contains',
      text: 'Vishal',
      condition: 'name'
    }]
      expect(checkFilterValues(values, contact)).toEqual(false)
    })
  test('return true because name  exist in contact', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }

    var values = [{
      criteria: 'contains',
      text: 'Kumar',
      condition: 'name'
    }]
      expect(checkFilterValues(values, contact)).toEqual(true)
    })
  test('return false because name doesnot begin with Arveen in contact', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }

    var values = [{
      criteria: 'begins',
      text: 'Kumar Maheshwari',
      condition: 'name'
    }]
      expect(checkFilterValues(values, contact)).toEqual(false)
    })
  test('return true because name  begin with Arveen in contact', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }

    var values = [{
      criteria: 'begins',
      text: 'Arveen',
      condition: 'name'
    }]
      expect(checkFilterValues(values, contact)).toEqual(true)
    })
  test('return true because name  exist with Arveen and contact in contacts', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }
    var values = [{
      criteria: 'is',
      text: 'Arveen Kumar Maheshwari',
      condition: 'name'
    },
    {
      criteria: 'is',
      text: '+923403630780',
      condition: 'number'
    }
  ]
      expect(checkFilterValues(values, contact)).toEqual(true)
    })
    test('return false because name  doesnot exist with Arveen and contact in contacts', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }
    var values = [{
      criteria: 'is',
      text: 'Arveen Kumar Maheshwari',
      condition: 'name'
    },
    {
      criteria: 'is',
      text: '+92340363078',
      condition: 'number'
    }
    ]
        expect(checkFilterValues(values, contact)).toEqual(false)
      })
  test('return error because contact data is missing', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari',
      'number': '+923403630780'
    }
    var values = [{
      criteria: 'is',
      text: 'Arveen Kumar Maheshwari',
      condition: 'name'
    },
    {
      criteria: 'is',
      text: '+92340363078',
      condition: 'number'
    }
    ]
    expect(() => { checkFilterValues(values, null) }).toThrowError(Error('contact data must contain and should be valid payload'))
  })
  test('return error because contact data.name is missing', () => {
    var contact = {
      'number': '+923403630780'
    }
    var values = [{
      criteria: 'is',
      text: 'Arveen Kumar Maheshwari',
      condition: 'name'
    },
    {
      criteria: 'is',
      text: '+92340363078',
      condition: 'number'
    }
    ]
    expect(() => { checkFilterValues(values, contact) }).toThrowError(Error('contact data must contain name and should be valid payload'))
  })
  test('return error because contact data.number is missing', () => {
    var contact = {
      'name': 'Arveen Kumar Maheshwari'
    }
    var values = [{
      criteria: 'is',
      text: 'Arveen Kumar Maheshwari',
      condition: 'name'
    },
    {
      criteria: 'is',
      text: '+92340363078',
      condition: 'number'
    }
    ]
    expect(() => { checkFilterValues(values, contact) }).toThrowError(Error('contact data must contain number and should be valid payload'))
  })
})
describe('Validate prepareChat in whatsapp logic layer', () => {
  test('should return an object', () => {
    let payload = {componentType: 'text', text: 'hi'}
    let companyUser = {
      companyId: {
        _id: '123',
        twilioWhatsApp: {sandboxNumber: '+123'}}
    }
    let contact = {
      contactId: '5abc',
      senderNumber: '+923322'
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
