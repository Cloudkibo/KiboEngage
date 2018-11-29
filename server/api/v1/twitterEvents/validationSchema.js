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
      required: false
    },
    id: {
      type: 'integer',
      required: false
    },
    text: {
      type: 'string',
      required: false
    },
    entities: {
      type: 'object',
      required: false
    }
  }
}
