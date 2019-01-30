/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string'
    },
    'type': {
      'type': 'string'
    },
    'description': {
      'type': 'string'
    },
    'companyId': {
      'type': 'string'
    },
    'createdBy': {
      'type': 'string'
    },
    'createdDate': {
      'type': 'string'
    }
  },
  'required': [
    'name',
    'type',
    'companyId',
    'createdBy'
  ]
}

exports.deletePayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'purpose': {
      'type': 'string'
    },
    'match': {
      'type': 'object',
      'properties': {
        '_id': {
          'type': 'string'
        },
        'name': {
          'type': 'string'
        },
        'type': {
          'type': 'string'
        },
        'description': {
          'type': 'string'
        },
        'companyId': {
          'type': 'string'
        },
        'createdBy': {
          'type': 'string'
        },
        'createdDate': {
          'type': 'string'
        }
      }
    }
  },
  'required': [
    'purpose',
    'match'
  ]
}

exports.updatePayload =
  {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    'type': 'object',
    'properties': {
      'purpose': {
        'type': 'string'
      },
      'match': {
        'type': 'object',
        'properties': {
          '_id': {
            'type': 'string'
          },
          'name': {
            'type': 'string'
          },
          'type': {
            'type': 'string'
          },
          'description': {
            'type': 'string'
          },
          'companyId': {
            'type': 'string'
          },
          'createdBy': {
            'type': 'string'
          },
          'createdDate': {
            'type': 'string'
          }
        }
      },
      'updated': {
        'type': 'object'
      }
    },
    'required': [
      'purpose',
      'match',
      'updated'
    ]
  }
