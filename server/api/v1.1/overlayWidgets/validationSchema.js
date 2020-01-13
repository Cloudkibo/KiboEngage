exports.createPayload = {
  type: 'object',
  properties: {
    widgetType: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    isActive: {
      type: 'boolean',
      required: true
    },
    initialState: {
      type: 'object',
      required: true
    },
    submittedState: {
      type: 'object',
      required: true
    },
    optInMessage: {
      type: 'array',
      required: true
    }
  }
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
    'page_value': {
      'type': 'string'
    },
    'status_value': {
      'type': 'string'
    },
    'type_value': {
      'type': 'string'
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page'
  ]
}
