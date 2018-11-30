const IpCountryModel = require('./ipcountry.model')

exports.findOneIpCountryObjectUsingQuery = (query) => {
  return IpCountryModel.findOne(query)
    .exec()
}
