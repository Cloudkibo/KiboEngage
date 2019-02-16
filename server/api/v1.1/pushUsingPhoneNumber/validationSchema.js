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
      type: 'array',
      items: {}
    },
    columns: {
      type: 'array',
      items: {}
    }
  }
}
