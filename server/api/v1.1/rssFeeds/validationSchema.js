exports.createPayload = {
  'type': 'object',
  'properties': {
    'feedUrl': {
      'type': 'string'
    },
    'title': {
      'type': 'string'
    },
    'storiesCount': {
      'type': 'integer'
    },
    'defaultFeed': {
      'type': 'boolean'
    },
    'isActive': {
      'type': 'boolean'
    },
    'pageIds': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    }
  },
  'required': [
    'feedUrl',
    'title',
    'storiesCount',
    'defaultFeed',
    'isActive',
    'pageIds'
  ]
}

exports.fetchPayload = {
  'properties': {
    'last_id': {
      'type': 'string'
    },
    'number_of_records': {
      'type': 'integer'
    },
    'first_page': {
      'type': 'string'
    },
    'search_value': {
      'type': 'string'
    },
    'status_value': {
      'type': 'string'
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page'
  ]
}