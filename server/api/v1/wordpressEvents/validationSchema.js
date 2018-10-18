/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.twitterwebhookPayload = {
  type: 'object',
  properties: {
    guid: {
      type: 'string',
      required: true
    },
    post_title: {
      type: 'string',
      required: true
    }
  }
}
