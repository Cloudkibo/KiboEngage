// TODO REMOVE THIS - SOJHARO
let mongoose = require('mongoose')
let Schema = mongoose.Schema

const cartSchema = new Schema({
  shopifyCartId: {
    type: String
  },
  cartToken: {
    type: String
  },
  storeId: {
    type: String
  },
  userId: {
    type: Schema.ObjectId,
    ref: 'users'  // Schema.ObjectId, ref: 'users'
  },
  companyId: {
    type: Schema.ObjectId,
    ref: 'companyprofile'
  },
  linePrice: {
    type: Number
  },
  status: {
    type: String
  },
  userRef: {
    type: String
  },
  productIds: {
    type: [String]
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  scheduled_at: {
    type: Date,
    default: () => Date.now() + 24 * 60 * 60 * 1000
  }
})

module.exports = mongoose.model('cartInfo', cartSchema)
