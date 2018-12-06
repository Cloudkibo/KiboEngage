exports.getAllPolls = {
  type: 'object',
  properties: {
    first_page: {
      type: 'string',
      required: true
    },
    filter_criteria: {
      type: 'object',
      required: true
    },
    number_of_records: {
      type: 'string',
      required: true
    }

  }
}

exports.createPoll = {
  type: 'object',
  properties: {
    domain_email: {
      type: 'string',
      required: true
    },
    user: {
      type: 'object',
      required: true
    }

  }
}
exports.createSurvey = {
  type: 'object',
  properties: {
    domain_email: {
      type: 'string',
      required: true
    },
    user: {
      type: 'object',
      required: true
    },
    questions: {
      type: 'array',
      required: true
    }

  }
}

exports.getAllSurveys = {
  type: 'object',
  properties: {
    first_page: {
      type: 'string',
      required: true
    },
    filter_criteria: {
      type: 'object',
      required: true
    },
    number_of_records: {
      type: 'string',
      required: true
    }

  }
}

exports.createCategory = {
  type: 'object',
  properties: {
    domain_email: {
      type: 'string',
      required: true
    },
    user: {
      type: 'object',
      required: true
    },
    name: {
      type: 'string',
      required: true
    }

  }

}

exports.editCategory = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    name: {
      type: 'string',
      required: true
    }

  }
}

exports.editPoll = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      required: true
    },
    title: {
      type: 'string',
      required: true
    },
    statement: {
      type: 'string',
      required: true
    },
    options: {
      type: 'string',
      required: true
    },
    category: {
      type: 'string',
      required: true
    }

  }
}

exports.editSurvey = {
  type: 'object',
  properties: {
    survey: {
      type: 'object',
      required: true
    },
    questions: {
      type: 'array',
      required: true
    }

  }
}

exports.createBroadcast = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      required: true
    }

  }
}

exports.getAllBroadcasts = {
  type: 'object',
  properties: {
    first_page: {
      type: 'string',
      required: true
    },
    filter_criteria: {
      type: 'object',
      required: true
    },
    number_of_records: {
      type: 'string',
      required: true
    },
    user: {
      type: 'object',
      required: true
    }

  }
}

exports.editBroadcast = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      required: true
    },
    title: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'string',
      required: true
    },
    category: {
      type: 'string',
      required: true
    }

  }
}

exports.createBot = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      required: true
    },
    companyUser: {
      type: 'object',
      required: true
    },
    title: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'string',
      required: true
    },
    category: {
      type: 'string',
      required: true
    }

  }
}

exports.editBot = {
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
      type: 'string',
      required: true
    },
    category: {
      type: 'string',
      required: true
    }

  }
}
