exports.getAllPayload = {
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
    'requested_page': {
      'type': 'integer'
    },
    'current_page': {
      'type': 'integer'
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page'
  ]
}
exports.createPayload = {
  type: 'object',
  properties: {
    listName: {
      type: 'string',
      required: true
    },
    content: {
      type: 'object',
      required: true
    },
    conditions: {
      type: 'object',
      required: true
    },
    parentListId: {
      type: 'string',
      required: true
    },
    parentListName: {
      type: 'string',
      required: true
    }
  }
}
exports.editPayload = {
  type: 'object',
  properties: {
    listName: {
      type: 'string',
      required: true
    },
    content: {
      type: 'object',
      required: true
    },
    conditions: {
      type: 'object',
      required: true
    },
    _id: {
      type: 'string',
      required: true
    }
  }
}
