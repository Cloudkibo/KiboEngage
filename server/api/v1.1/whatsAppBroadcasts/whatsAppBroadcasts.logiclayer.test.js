const { getCriterias } = require('./whatsAppBroadcasts.logiclayer')

describe('Validate getCriterias for pagaination', () => {
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