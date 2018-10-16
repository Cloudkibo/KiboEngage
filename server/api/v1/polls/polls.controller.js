const logger = require('../../../components/logger')
const Polls = require('./Polls.model')
const PollResponseDataLayer = require('./pollresponse.datalayer')
const PollDataLayer = require('./sessions.datalayer')
const PollLogicLayer = require('./sessions.logiclayer')
const PollPageDataLayer = require('./sessions.datalayer')
const broadcastUtility = require('./../broadcasts/broadcasts.utility')
const TAG = 'api/v1/polls/polls.controller.js'
const utility = require('../utility')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      PollDataLayer.genericFindForPolls({companyId: companyUser.companyId})
        .then(polls => {
          PollPageDataLayer.genericFind({companyId: companyUser.companyId})
            .then(pollpages => {
              PollResponseDataLayer.aggregateForPollResponse([{$group: {
                _id: {pollId: '$pollId'},
                count: {$sum: 1}}}])
                .then(responsesCount1 => {
                  let responsesCount = PollLogicLayer.prepareResponsesPayload(polls, responsesCount1)
                  res.status(200).json({
                    status: 'success',
                    payload: {polls, pollpages, responsesCount}
                  })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed to aggregate poll responses ${JSON.stringify(error)}`})
                })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch poll pages ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch polls ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.allPolls = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      let criterias = PollLogicLayer.getCriterias(req.body, companyUser)
      PollDataLayer.aggregateForPolls(criterias.countCriteria)
        .then(pollsCount => {
          PollDataLayer.aggregateForPolls(criterias.fetchCriteria)
            .then(polls => {
              PollPageDataLayer.genericFind({companyId: companyUser.companyId})
                .then(pollpages => {
                  PollResponseDataLayer.aggregateForPollResponse([{$group: {
                    _id: {pollId: '$pollId'},
                    count: {$sum: 1}
                  }}])
                    .then(responsesCount1 => {
                      let responsesCount = PollLogicLayer.prepareResponsesPayload(polls, responsesCount1)
                      if (req.body.first_page === 'previous') {
                        res.status(200).json({
                          status: 'success',
                          payload: {polls: polls.reverse(), pollpages: pollpages, responsesCount: responsesCount, count: polls.length > 0 ? pollsCount[0].count : 0}
                        })
                      } else {
                        res.status(200).json({
                          status: 'success',
                          payload: {polls: polls, pollpages: pollpages, responsesCount: responsesCount, count: polls.length > 0 ? pollsCount[0].count : 0}
                        })
                      }
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to aggregate poll responses ${JSON.stringify(error)}`})
                    })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed to fetch poll pages ${JSON.stringify(error)}`})
                })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch polls ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pollsCount ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {

        utility.callApi(`companyprofile/query`, 'post', {ownerId: req.user._id})
          .then(companyProfile => {
            utility.callApi(`usage/planGeneric`, 'post', {planId: companyProfile.planId})
              .then(planUsage => {
                planUsage = planUsage[0]
                utility.callApi(`usage/companyGeneric`, 'post', {companyId: companyProfile._id})
                  .then(companyUsage => {
                    companyUsage = companyUsage[0]
          if (planUsage.polls !== -1 && companyUsage.polls >= planUsage.polls) {
            return res.status(500).json({
              status: 'failed',
              description: `Your polls limit has reached. Please upgrade your plan to premium in order to create more polls`
            })
          }
          let pollPayload = {
            platform: 'facebook',
            statement: req.body.statement,
            options: req.body.options,
            companyId: companyUser.companyId,
            userId: req.user._id
          }
          if (req.body.isSegmented) {
            pollPayload.isSegmented = true
            pollPayload.segmentationPageIds = (req.body.segmentationPageIds)
              ? req.body.segmentationPageIds
              : null
            pollPayload.segmentationGender = (req.body.segmentationGender)
              ? req.body.segmentationGender
              : null
            pollPayload.segmentationLocale = (req.body.segmentationLocale)
              ? req.body.segmentationLocale
              : null
            pollPayload.segmentationTags = (req.body.segmentationTags)
              ? req.body.segmentationTags
              : null
            pollPayload.segmentationPoll = (req.body.segmentationPoll)
              ? req.body.segmentationPoll
              : null
          }
          if (req.body.isList) {
            pollPayload.isList = true
            pollPayload.segmentationList = (req.body.segmentationList)
              ? req.body.segmentationList
              : null
          }
          let pagesFindCriteria = {companyId: companyUser.companyId, connected: true}
          if (req.body.isSegmented) {
            if (req.body.segmentationPageIds.length > 0) {
              pagesFindCriteria = _.merge(pagesFindCriteria, {
                pageId: {
                  $in: req.body.segmentationPageIds
                }
              })
            }
          }
          Pages.find(pagesFindCriteria).exec((err, pages) => {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            }
            pages.forEach((page) => {
              Webhooks.findOne({pageId: page.pageId}).populate('userId').exec((err, webhook) => {
                if (err) {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error ${JSON.stringify(err)}`
                  })
                }
                if (webhook && webhook.isEnabled) {
                  needle.get(webhook.webhook_url, (err, r) => {
                    if (err) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error ${JSON.stringify(err)}`
                      })
                    } else if (r.statusCode === 200) {
                      if (webhook && webhook.optIn.POLL_CREATED) {
                        var data = {
                          subscription_type: 'POLL_CREATED',
                          payload: JSON.stringify({userId: req.user._id, companyId: companyUser.companyId, statement: req.body.statement, options: req.body.options})
                        }
                        needle.post(webhook.webhook_url, data,
                          (error, response) => {
                            if (error) {
                              // return res.status(500).json({
                              //   status: 'failed',
                              //   description: `Internal Server Error ${JSON.stringify(err)}`
                              // })
                            }
                          })
                      }
                    } else {
                      webhookUtility.saveNotification(webhook)
                    }
                  })
                }
              })
            })
          })
          const poll = new Polls(pollPayload)

          // save model to MongoDB
          poll.save((err, pollCreated) => {
            if (err) {
              res.status(500).json({
                status: 'Failed',
                error: err,
                description: 'Failed to insert record'
              })
            } else {
              require('./../../../config/socketio').sendMessageToClient({
                room_id: companyUser.companyId,
                body: {
                  action: 'poll_created',
                  payload: {
                    poll_id: pollCreated._id,
                    user_id: req.user._id,
                    user_name: req.user.name,
                    company_id: companyUser.companyId
                  }
                }
              })
              res.status(201).json({status: 'success', payload: pollCreated})
            }
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch company usage ${JSON.stringify(error)}`
          })
        })
      })
      .catch(error => {
        return res.status(500).json({
          status: 'failed',
          payload: `Failed to plan usage ${JSON.stringify(error)}`
        })
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to company profile ${JSON.stringify(error)}`
      })
    })
  })
  .catch(error => {
    return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
  })
}
