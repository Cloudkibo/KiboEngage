
const logger = require('../../../components/logger')
const TAG = 'api/ipcountry/ipcountry.controller.js'
const IpCountryDataLayer = require('./ipcountry.datalayer')
const callApi = require('../utility')

exports.findIp = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(company => {
      if (!company) {
        return res.status(404)
          .json({status: 'failed', description: 'No registered company found.'})
      }
      let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress
      logger.serverLog(TAG, `IP found: ${ip}`)
      if (ip.includes('ffff')) {
        let temp = ip.split(':')
        ip = temp[temp.length - 1]
      }
      let ip2number = (parseInt(ip.split('.')[0]) * 256 * 256 * 256) + (parseInt(ip.split('.')[1]) * 256 * 256) + (parseInt(ip.split('.')[2]) * 256) + (parseInt(ip.split('.')[3]))

      IpCountryDataLayer.findOneIpCountryObjectUsingQuery({startipint: {$lte: ip2number}, endipint: {$gte: ip2number}})
        .then(gotLocation => {
          let response = {
            ip: ip
          }
          if (!gotLocation) {
            response.ccode = 'n/a'
            response.country = 'n/a'
          } else {
            response.ccode = gotLocation.ccode
            response.country = gotLocation.country
          }
          res.status(200).json({status: 'success', payload: response})
        })
        .catch(err => {
          return res.status(500)
            .json({status: 'failed', description: 'Internal Server Error ' + JSON.stringify(err)})
        })
    })
    .catch(err => {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error ' + JSON.stringify(err)})
    })
}
