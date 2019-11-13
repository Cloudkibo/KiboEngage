/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/
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
