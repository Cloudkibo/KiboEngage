/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.getMessagePayload = {
  type: 'object',
  properties: {
    first_page: {
      type: 'string'
    },
    last_id: {
      type: 'string'
    },
    number_of_records: {
      type: 'string'
    }
  }
}
