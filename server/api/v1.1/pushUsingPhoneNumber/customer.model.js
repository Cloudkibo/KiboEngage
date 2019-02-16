let mongoose = require('mongoose')
let Schema = mongoose.Schema

const customerSchema = new Schema({
  pageId: {
    type: String
  },
  userId: {
    type: String
  },
  companyId: {
    type: String
  },
  fileName: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  payload: {
    type: Schema.Types.Mixed
  }
})

module.exports = mongoose.model('customerTest', customerSchema)
