/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createSequencePayload = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      required: true
    }
  }
}

exports.editSequencePayload = {
  type: 'object',
  properties: {
    sequenceId: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true
    }
  }
}

exports.createMessagePayload = {
  type: 'object',
  properties: {
    schedule: {
      type: 'object',
      required: true
    },
    sequenceId: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'array',
      items: {
        type: 'object'
      }
    },
    title: {
      type: 'string',
      require: true
    }
  }
}

exports.editMessagePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    title: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'array',
      items: {
        type: 'object'
      }
    }
  }
}

exports.setSchedulePayload = {
  type: 'object',
  properties: {
    messageId: {
      type: 'string',
      required: true
    },
    condition: {
      type: 'string',
      required: true
    },
    days: {
      type: 'string',
      require: true
    },
    date: {
      type: 'string',
      require: true
    }
  }
}

exports.getAllPayload = {
  type: 'object',
  properties: {
    first_page: {
      type: 'string'
    },
    filter_criteria: {
      type: 'string'
    },
    number_of_records: {
      type: 'string'
    }
  }
}

exports.subscribeToSequencePayload = {
  type: 'object',
  properties: {
    sequenceId: {
      type: 'string',
      required: true
    },
    subscriberIds: {
      type: 'array',
      items: [
        {
          type: 'string'
        }
      ]
    }
  }
}
exports.unsubscribeToSequencePayload = {
  type: 'object',
  properties: {
    sequenceId: {
      type: 'string',
      required: true
    },
    subscriberIds: {
      type: 'array',
      items: [
        {
          type: 'string'
        }
      ]
    }
  }
}

exports.testSchedulerPayload = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      required: true
    }
  }
}

exports.updateSegmentationPayload = {
  type: 'object',
  properties: {
    sequenceId: {
      type: 'string',
      required: true
    },
    messageId: {
      type: 'string',
      required: true
    },
    segmentationCondition: {
      type: 'string',
      required: true
    },
    segmentation: {
      type: 'array',
      items: {
        'type': 'object'
      }
    }
  }
}

exports.updateTriggerPayload = {
  type: 'object',
  properties: {
    sequenceId: {
      type: 'string'
    },
    messageId: {
      type: 'string'
    },
    type: {
      type: 'string',
      required: true
    }
  }
}
