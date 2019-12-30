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

exports.getRssFeedPostsPayload = {
  'type': 'object',
  'properties': {
    'feedId': {
      'type': 'string'
    },
    'requested_page': {
      'type': 'integer'
    },
    'last_id': {
      'type': 'string'
    },
    'current_page': {
      'type': 'integer'
    },
    'number_of_records': {
      'type': 'integer'
    },
    'first_page': {
      'type': 'string'
    },
    'page_value': {
      'type': 'string'
    },
    'startDate': {
      'type': 'string'
    },
    'endDate': {
      'type': 'string'
    }
  },
  'required': [
    'feedId',
    'last_id',
    'number_of_records',
    'first_page'
  ]
}
