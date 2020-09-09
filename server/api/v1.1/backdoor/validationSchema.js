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
exports.getUserSummary = {
  properties: {
    userId: {
      type: 'string',
      required: true
    },
    days: {
      type: 'number',
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
exports.allUserBroadcastsPayload = {
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
    filter_criteria: {
      type: 'object',
      required: true,
      properties: {
        search_value: {
          type: 'string',
          required: true
        },
        type_value: {
          type: 'string',
          required: true
        }
      }
    }
  }
}
exports.getAllBroadcastsPayload = {
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
    filter_criteria: {
      type: 'object',
      required: true,
      properties: {
        search_value: {
          type: 'string',
          required: true
        },
        days: {
          type: 'number',
          required: true
        }
      }
    }
  }
}
exports.getAllSubscribersPayload = {
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
    filter_criteria: {
      type: 'object',
      required: true,
      properties: {
        search_value: {
          type: 'string',
          required: true
        },
        gender_value: {
          type: 'string',
          required: true
        },
        locale_value: {
          type: 'string',
          required: true
        }
      }
    }
  }
}
exports.getPageUsersPayload = {
  properties: {
    pageId: {
      type: 'string',
      required: true
    }
  }
}
exports.commentCapturePayload = {
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
exports.actingAsUserPayload = {
  properties: {
    type: {
      type: 'string',
      required: true
    },
    domain_email: {
      type: 'string',
      required: false
    },
    name: {
      type: 'string',
      required: false
    }
  }
}
