exports.createPayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    },
    QRCode: {
      type: 'string',
      required: true
    },
    optInMessage: {
      type: 'array',
      required: true
    }
  }
}
exports.updatePayload = {
  type: 'object',
  properties: {
    optInMessage: {
      type: 'array',
      required: true
    }
  }
}
