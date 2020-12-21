exports.sendBroadcastPayload = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'array',
      required: true
    },
    platform: {
      type: 'string',
      required: true
    },
    phoneNumber: {
      type: 'string',
      required: true
    }
  }
}
exports.payload = {
  type: 'object',
  properties: {
    last_id: {
      type: 'string',
      required: true
    },
    number_of_records: {
      type: 'number',
      required: true
    },
    first_page: {
      type: 'string',
      required: true
    },
    title: {
      type: 'string',
      required: false
    }
  }
}
exports.responsesPayload = {
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
    'responses': {
      'type': 'array'
    },
    'operator': {
      'type': 'string'
    },
    'purpose': {
      'type': 'string'
    }
  },
  'required': [
    'purpose'
  ]
}
exports.followupPayload = {
  'type': 'object',
  'properties': {
    'responses': {
      'type': 'array'
    },
    'keywords': {
      'type': 'array'
    },
    'message': {
      'type': 'array'
    },
    'broadcasts': {
      'type': 'array'
    },
    'operator': {
      'type': 'string'
    },
    'title': {
      'type': 'string'
    },
    'phoneNumber': {
      'type': 'string'
    }
  },
  'required': [
    'responses',
    'keywords',
    'message',
    'broadcasts',
    'operator',
    'title',
    'phoneNumber'
  ]
}
