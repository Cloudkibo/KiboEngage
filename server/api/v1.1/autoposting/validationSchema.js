/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  type: 'object',
  properties: {
    subscriptionUrl: {
      type: 'string',
      required: true
    },
    subscriptionType: {
      type: 'string',
      required: true
    },
    accountTitle: {
      type: 'string',
      required: true
    },
    isSegmented: {
      type: 'boolean'
    }
  }
}

exports.editPayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    accountTitle: {
      type: 'string'
    },
    isActive: {
      type: 'boolean'
    },
    actionType: {
      type: 'string'
    },
    isSegmented: {
      type: 'boolean'
    },
    filterTweets: {
      'type': 'boolean'
    },
    filterTags: {
      'type': 'array'
    },
    moderateTweets: {
      'type': 'boolean'
    },
    approvalChannel: {
      'type': 'object'
    },
    segmentationPageIds: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    segmentationGender: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    segmentationLocale: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    segmentationTags: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  }
}
