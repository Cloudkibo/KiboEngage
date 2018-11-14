const mongoose = require('mongoose')

const Schema = mongoose.Schema

const categorySchema = new Schema({
  name: String,
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  createdBySuperUser: {type: Boolean, default: false}
})

module.exports = mongoose.model('category', categorySchema)
