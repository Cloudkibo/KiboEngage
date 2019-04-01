exports.getAllUsersPayload = {
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
      type: 'boolean',
      required: true
    },
    filter: {
      type: 'boolean',
      required: true
    },
    filter_criteria: {
      type: 'object',
      required: true
    }
  }
}
exports.getAllPagesPayload = {
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
    },
    search_value: {
      type: 'string',
      required: true
    }
  }
}
