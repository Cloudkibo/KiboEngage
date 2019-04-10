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
    }
  }
}
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
    }
  }
}
