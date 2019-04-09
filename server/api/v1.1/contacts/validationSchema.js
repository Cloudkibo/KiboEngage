exports.uploadPayload = {
  type: 'object',
  properties: {
    phoneColumn: {
      type: 'string',
      required: true
    },
    nameColumn: {
      type: 'string',
      required: true
    }
  }
}
exports.uploadNumbersPayload = {
  type: 'object',
  properties: {
    numbers: {
      type: 'array',
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
    }
  }
}
