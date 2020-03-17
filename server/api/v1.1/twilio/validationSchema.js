exports.sendSMSPayload = {
  'type': 'object',
  'properties': {
    'numbers': {
      'type': 'array'
    },
    'template_code': {
      'type': 'string'
    }
  },
  'required': [
    'numbers',
    'template_code'
  ]
}

exports.receiveSMSPayload = {
  'type': 'object',
  'properties': {
    'To': {
      'type': 'string'
    },
    'From': {
      'type': 'string'
    },
    'Body': {
      'type': 'string'
    }
  },
  'required': [
    'To',
    'From',
    'Body'
  ]
}
