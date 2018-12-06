exports.allPollsPayload = {
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
    'days': {
      'type': 'string'
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page',
    'days'
  ]
}
exports.createPayload = {
  'type': 'object',
  'properties': {
    'statement': {
      'type': 'string'
    },
    'sent': {
      'type': 'integer'
    },
    'options': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    },
    'isSegmented': {
      'type': 'boolean'
    },
    'segmentationPageIds': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    },
    'segmentationGender': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    },
    'segmentationLocale': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    },
    'segmentationTags': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    },
    'segmentationPoll': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    },
    'isList': {
      'type': 'boolean'
    },
    'segmentationList': {
      'type': 'array',
      'items': [
        {
          'type': 'string'
        }
      ]
    },
    'fbMessageTag': {
      'type': 'string'
    }
  },
  'required': [
    'statement',
    'sent',
    'options',
    'isSegmented',
    'segmentationPageIds',
    'segmentationGender',
    'segmentationLocale',
    'segmentationTags',
    'segmentationPoll',
    'isList',
    'segmentationList'
  ]
}
