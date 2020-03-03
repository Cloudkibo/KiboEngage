/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/
exports.getPostsPayload = {
  'type': 'object',
  'properties': {
    'last_id': {
      'type': 'string'
    },
    'pageIds': {
      'type': 'array'
    },
    'number_of_records': {
      'type': 'integer'
    },
    'first_page': {
      'type': 'string'
    },
    'search_value': {
      'type': 'string'
    },
    'type_value': {
      'type': 'string'
    },
    'startDate': {
      'type': 'string'
    },
    'endDate': {
      'type': 'string'
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page',
    'pageIds'
  ]
}
exports.postPayload = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    reply: {
      type: 'array',
      required: true
    },
    payload: {
      type: 'object'
    },
    includeKeywords: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    },
    excludedKeywords: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    },
    captureOption: {
      type: 'string',
      required: true
    }
  }
}
exports.postUpdatePayload = {
  'type': 'object',
  'properties': {
    excludedKeywords: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    },
    includeKeywords: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    }
  }
}
exports.getCommentsPayload = {
  type: 'object',
  properties: {
    first_page: {
      type: 'boolean',
      required: true
    },
    last_id: {
      type: 'string',
      required: true
    },
    number_of_records: {
      type: 'number',
      required: true
    },
    postId: {
      type: 'string',
      required: true
    }
  }
}
exports.getRepliesToCommentPayload = {
  type: 'object',
  properties: {
    first_page: {
      type: 'boolean',
      required: true
    },
    last_id: {
      type: 'string',
      required: true
    },
    number_of_records: {
      type: 'number',
      required: true
    },
    commentId: {
      type: 'string',
      required: true
    },
    sort_value: {
      type: 'number',
      required: true
    }
  }
}
exports.fetchGlobalPostDataPayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    },
    number_of_records: {
      type: 'number',
      required: true
    }
  }
}
exports.filterCommentsPayload = {
  type: 'object',
  properties: {
    search_value: {
      type: 'string'
    },
    startDate: {
      type: 'string'
    },
    endDate: {
      type: 'string'
    },
    postId: {
      type: 'string',
      required: true
    },
    first_page: {
      type: 'boolean',
      required: true
    },
    last_id: {
      type: 'string',
      required: true
    },
    number_of_records: {
      type: 'number',
      required: true
    }
  }
}
