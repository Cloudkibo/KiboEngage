exports.createSchema = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    },
    webhook_url: {
      type: 'string',
      required: true
    },
    token: {
      type: 'string',
      required: true
    },
    optIn: {
      type: 'object',
      required: true
    }
  }
}

exports.editSchema = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    webhook_url: {
      type: 'string',
      required: true
    },
    token: {
      type: 'string',
      required: true
    },
    optIn: {
      type: 'object',
      required: true
    }
  }
}
exports.enabledSchema = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    isEnabled: {
      type: 'boolean',
      required: true
    }
  }
}
