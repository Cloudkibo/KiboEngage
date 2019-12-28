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
