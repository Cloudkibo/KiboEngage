let mongoose = require('mongoose')
let Schema = mongoose.Schema

const storeSchema = new Schema({
  userId: {
    type: Schema.ObjectId,
    ref: 'users'  // Schema.ObjectId, ref: 'users'
  },
  pageId: {
    type: String
  },
  shopUrl: {
    type: String
  },
  shopToken: {
    type: String
  },
  companyId: {
    type: Schema.ObjectId,
    ref: 'companyprofile'
  },
  isActive: {
    type: Boolean,
    default: true
  }
})

module.exports = mongoose.model('storeInfo', storeSchema)
