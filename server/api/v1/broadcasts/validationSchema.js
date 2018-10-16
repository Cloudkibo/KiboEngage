exports.allBroadcastsPayload = {
  'type': 'object',
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
    'filter': {
      'type': 'boolean'
    },
    'filter_criteria': {
      'type': 'object',
      'properties': {
        'search_value': {
          'type': 'string'
        },
        'type_value': {
          'type': 'string'
        },
        'days': {
          'type': 'string'
        }
      },
      'required': [
        'search_value',
        'type_value',
        'days'
      ]
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page',
    'filter',
    'filter_criteria'
  ]
}
exports.addButtonPayload = {
  'type': 'object',
  'properties': {
    'type': {
      'type': 'string'
    },
    'title': {
      'type': 'string'
    }
  },
  'required': [
    'type',
    'title'
  ]
}
exports.editButtonPayload = {
  'type': 'object',
  'properties': {
    'type': {
      'type': 'string'
    },
    'title': {
      'type': 'string'
    },
    'id': {
      'type': 'string'
    }
  },
  'required': [
    'type',
    'title',
    'id'
  ]
}
