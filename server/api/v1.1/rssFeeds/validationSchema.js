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
      'type': 'array'
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
exports.previewPayload = {
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
    'pageIds': {
      'type': 'array'
    }
  },
  'required': [
    'feedUrl',
    'title',
    'storiesCount',
    'pageIds'
  ]
}
exports.editPayload = {
  'type': 'object',
  'properties': {
    'feedId': {
      'type': 'string'
    },
    'updatedObject': {
      'type': 'object'
    }
  },
  'required': [
    'feedId',
    'updatedObject'
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
