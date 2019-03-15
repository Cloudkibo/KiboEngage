const logicLayer = require('./smsBroadcasts.logiclayer')
const dataLayer = require('./smsBroadcasts.datalayer')
const utility = require('../utility')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization) // fetch company user
    .then(companyuser => {
      let criteria = logicLayer.getCriterias(req.body, companyuser)
      dataLayer.countBroadcasts(criteria.countCriteria[0].$match)
        .then(count => {
          let aggregateMatch = criteria.finalCriteria[0].$match
          let aggregateSort = criteria.finalCriteria[1].$sort
          let aggregateSkip = criteria.finalCriteria[2].$skip
          let aggregateLimit = criteria.finalCriteria[3].$limit
          dataLayer.aggregateForBroadcasts(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
            .then(broadcasts => {
              res.status(200).json({
                status: 'success',
                payload: {broadcasts: broadcasts, count: count.length > 0 ? count[0].count : 0}
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscriber count ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.sendBroadcast = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email, populate: 'companyId'}, req.headers.authorization) // fetch company user
    .then(companyUser => {
      dataLayer.createBroadcast(logicLayer.prepareBroadCastPayload(req, companyUser.companyId._id))
        .then(broadcast => {
          utility.callApi(`contacts/query`, 'post', {companyId: companyUser.companyId._id}, req.headers.authorization) // fetch company user
            .then(contacts => {
              const accountSid = companyUser.companyId.twilio.accountSID
              const authToken = companyUser.companyId.twilio.authToken
              const client = require('twilio')(accountSid, authToken)
              for (let i = 0; i < contacts.length; i++) {
                client.messages
                  .create({
                    body: req.body.payload[0].text,
                    from: req.body.phoneNumber,
                    to: contacts[i].number
                  })
                  .then({})
              }
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch contacts ${JSON.stringify(error)}`
              })
            })
          return res.status(200)
            .json({status: 'success', description: 'Conversation sent successfully!'})
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create broadcast ${JSON.stringify(error)}`
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch company user ${JSON.stringify(error)}`
          })
        })
    })
}
