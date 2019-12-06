// todo schemas to go here
exports.createSchema = { // todo edit it
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    }
  }
}

exports.fetchColumnsPayload = { // todo edit it
  type: 'object',
  properties: {
    formId: {
      type: 'string',
      required: true
    }
  }
}
