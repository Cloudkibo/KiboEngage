
const logger = require('../../../components/logger')
const TAG = 'api/ipcountry/ipcountry.controller.js'
const callApi = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.findIp = function (req, res) {
  callApi.callApi('companyuser/query', 'post', { companyId: req.body.company_id })
    .then(company => {
      if (!company || company.length < 1) {
        return sendErrorResponse(res, 404, '', 'No registered company found.')
      }
      let ip = req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.socket && req.connection.socket.remoteAddress) || ''
      if (ip && ip.includes('ffff')) {
        let temp = ip.split(':')
        ip = temp[temp.length - 1]
      }
      let ip2number = (parseInt(ip.split('.')[0]) * 256 * 256 * 256) + (parseInt(ip.split('.')[1]) * 256 * 256) + (parseInt(ip.split('.')[2]) * 256) + (parseInt(ip.split('.')[3]))

      callApi.callApi('ipcountry/findIp', 'post', { ip, ip2number }, 'accounts', req.headers.authorization)
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
          sendSuccessResponse(res, 200, response)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.findIp`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', 'Internal Server Error ' + JSON.stringify(err))
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.findIp`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', 'Internal Server Error ' + JSON.stringify(err))
    })
}
