exports.createPayload = {
  type: 'object',
  properties: {
    widgetType: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    isActive: {
      type: 'boolean',
      required: true
    },
    initialState: {
      type: 'object',
      required: true
    },
    submittedState: {
      type: 'object',
      required: true
    },
    optInMessage: {
      type: 'array',
      required: true
    }
  }
}
