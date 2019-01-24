/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  type: 'object',
  properties: {
    companyId: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    userId: {
      type: 'string',
      required: true
    },
    subscriberId: {
      type: 'string',
      required: true
    }
  }
}
