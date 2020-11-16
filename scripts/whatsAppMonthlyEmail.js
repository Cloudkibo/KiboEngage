const logger = require('../server/components/logger')
const utility = require('../server/api/v1.1/utility')
const TAG = 'scripts/whatsAppMessageStatus.js'
const {_getWhatsAppMetricsData} = require('../server/api/v1.1/backdoor/backdoor.controller')
const LogicLayer = require('../server/api/v1.1/backdoor/logiclayer')
const needle = require('needle')
const async = require('async')
const EmailTemplate = require('../server/api/v1.1/backdoor/emailTemplate')
const sgMail = require('@sendgrid/mail')
const config = require('../server/config/environment/index')

exports.runScript = function () {
  let aggregateQuery = [
    {
      $lookup:
        {
          from: 'companyprofiles',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'companyProfile'
        }
    },
    {
      $match: {'companyProfile.whatsApp': {$exists: true}, role: 'buyer'}
    }
  ]
  let endDate = new Date()
  let startDate = new Date((endDate.getTime() - (30 * 24 * 60 * 60 * 1000)))
  let startMonth = ('0' + (startDate.getMonth() + 1)).slice(-2)
  let startDay = ('0' + startDate.getDate()).slice(-2)
  let finalStartDate = `${startDate.getFullYear()}-${startMonth}-${startDay}`
  let endMonth = ('0' + (endDate.getMonth() + 1)).slice(-2)
  let endDay = ('0' + endDate.getDate()).slice(-2)
  let finalEndDate = `${endDate.getFullYear()}-${endMonth}-${endDay}`

  let requests = []
  utility.callApi(`user/aggregate`, 'post', aggregateQuery)
    .then(users => {
      for (let i = 0; i < users.length; i++) {
        requests.push(_getWhatsAppMetricsData({startDate: finalStartDate, endDate: finalEndDate, companyId: users[i].companyProfile[0]._id}))
      }
      Promise.all(requests)
        .then(results => {
          let messages = []
          async.eachOf(results, function (result, j, next) {
            result.email = users[j].email
            let graph = LogicLayer.setChartData(result.graphDatas, finalStartDate, finalEndDate)
            needle(
              'post',
              `https://quickchart.io/chart/create`,
              {
                width: 500,
                devicePixelRatio: 1.0,
                backgroundColor: 'white',
                chart: JSON.stringify(graph)
              },
              {json: true}
            )
              .then(resp => {
                let message = {
                  to: users[j].email,
                  from: 'support@cloudkibo.com',
                  subject: 'KiboPush WhatsApp: Monthly Summary',
                  text: 'Welcome to KiboPush'
                }
                message.html = EmailTemplate.getWhatsAppEmail(users[j].name, result, resp.body.url)
                messages.push(message)
                next()
              })
              .catch((err) => {
                const message = err || 'Failed to send montly email'
                logger.serverLog(message, `${TAG}: exports.runScript`, {}, {}, 'error')
                next(err)
              })
          }, function (err) {
            if (err) {
              const message = err || 'Failed to send montly email'
              logger.serverLog(message, `${TAG}: exports.runScript`, {}, {}, 'error')
            } else {
              sgMail.setApiKey(config.SENDGRID_API_KEY)
              sgMail.send(messages)
            }
          })
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch users'
      logger.serverLog(message, `${TAG}: exports.runScript`, {}, {}, 'error')
    })
}
