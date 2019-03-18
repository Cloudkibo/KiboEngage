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
