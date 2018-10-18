/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.twitterwebhookPayload = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      required: true
    },
    id: {
      type: 'string',
      required: true
    },
    text: {
      type: 'string',
      required: true
    },
    entities: {
      type: 'object',
      required: true
    }
  }
}
