exports.uploadCSV = {
  type: 'object',
  properties: {
    phoneColumn: {
      type: 'string'
    },
    _id: {
      type: 'string'
    },
    message: {
      type: 'object'
    },
    columns: {
      type: 'array',
      items: {}
    },
    file: {
      type: 'object'
    }
  }
}
