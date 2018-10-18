/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
    type: 'object',
    properties: {
        tag: {
        type: 'string',
        required: true
      }
  }
}

exports.renamePayload = {
    type: 'object',
    properties: {
        tagId: {
        type: 'string',
        required: true
      },
      tagName: {
        type: 'string',
        required: true
      }
  }
}