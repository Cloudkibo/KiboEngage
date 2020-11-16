
const utility = require('../utility')
const logicLayer = require('./lists.logiclayer')
const PollDataLayer = require('../polls/polls.datalayer')
const SurveyDataLayer = require('../surveys/surveys.datalayer')
const PollResponseDataLayer = require('../polls/pollresponse.datalayer')
const SurveyResponseDataLayer = require('../surveys/surveyresponse.datalayer')
const async = require('async')
const logger = require('../../../components/logger')
const TAG = 'api/lists/lists.controller.js'
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.allLists = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`lists/query`, 'post', { companyId: companyUser.companyId })
        .then(lists => {
          sendSuccessResponse(res, 200, lists)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allLists`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch lists ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allLists`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.getAll = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`lists/aggregate`, 'post', criterias.countCriteria) // fetch lists count
        .then(count => {
          utility.callApi(`lists/aggregate`, 'post', criterias.fetchCriteria) // fetch lists
            .then(lists => {
              sendSuccessResponse(res, 200, {lists: lists, count: count.length > 0 ? count[0].count : 0})
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch lists ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch list count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          if (planUsage.segmentation_lists !== -1 && companyUsage.segmentation_lists >= planUsage.segmentation_lists) {
            return res.status(500).json({
              status: 'failed',
              description: `Your lists limit has reached. Please upgrade your plan to create more lists.`
            })
          } else {
            async.parallelLimit([
              function (callback) {
                createList(req, callback)
              }
            ], 10, function (err, results) {
              if (err) {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to create list ${JSON.stringify(err)}`)
              } else {
                sendSuccessResponse(res, 200, 'List created successfully!')
              }
            })
          }
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to plan usage ${JSON.stringify(error)}`)
    })
}

function createList (req, callback) {
  utility.callApi(`lists`, 'post', {
    companyId: req.user.companyId,
    userId: req.user._id,
    listName: req.body.listName,
    conditions: req.body.conditions,
    content: req.body.content,
    parentList: req.body.parentListId,
    parentListName: req.body.parentListName,
    joiningCondition: req.body.joiningCondition
  })
    .then(listCreated => {
      utility.callApi(`featureUsage/updateCompany`, 'put', {
        query: {companyId: req.body.companyId},
        newPayload: { $inc: { segmentation_lists: 1 } },
        options: {}
      })
        .then(updated => {
          callback(null, 'success')
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: createList`, req.body, {user: req.user}, 'error')
          callback(error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: createList`, req.body, {user: req.user}, 'error')
      callback(error)
      updateCompanyUsage(req.user.companyId, 'segmentation_lists', 1)
    })
}

exports.editList = function (req, res) {
  if (req.body.newListName !== req.body.listName) {
    let label = req.body.newListName
    let data = {
      listName: req.body.newListName,
      conditions: req.body.conditions,
      joiningCondition: req.body.joiningCondition,
      content: req.body.content
    }
    async.parallelLimit([
      function (callback) {
        updateList(data, req, callback)
      }
    ], 10, function (err, results) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.editList`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Failed to create tag on Facebook ${JSON.stringify(label.error)}`)
      }
      sendSuccessResponse(res, 200, 'List updated successfully!')
    })
  } else {
    let data = {
      listName: req.body.newListName,
      conditions: req.body.conditions,
      joiningCondition: req.body.joiningCondition,
      content: req.body.content
    }
    async.parallelLimit([
      function (callback) {
        updateList(data, req, callback)
      }
    ], 10, function (err, results) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.editList`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Failed to update list`)
      } else {
        sendSuccessResponse(res, 200, 'List updated successfully!')
      }
    })
  }
}

function updateList (data, req, callback) {
  utility.callApi(`lists/update`, 'post', {query: {companyId: req.user.companyId, listName: req.body.listName}, newPayload: data, options: {}})
    .then(savedList => {
      callback(null, savedList)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: updateList`, req.body, {user: req.user}, 'error')
      callback(error)
    })
}

exports.viewList = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      utility.callApi(`lists/${req.params.id}`, 'get', {})
        .then(list => {
          if (list.initialList === true) {
            utility.callApi(`phone/query`, 'post', {
              companyId: companyUser.companyId,
              hasSubscribed: true,
              fileName: { $all: [list.listName] },
              pageId: { $exists: true, $ne: null }
            })
              .then(number => {
                if (number.length > 0) {
                  let criterias = logicLayer.getSubscriberCriteria(number, companyUser)
                  utility.callApi(`subscribers/query`, 'post', criterias)
                    .then(subscribers => {
                      let content = logicLayer.getContent(subscribers)
                      utility.callApi(`lists/${req.params.id}`, 'put', {
                        content: content
                      })
                        .then(savedList => {
                          sendSuccessResponse(res, 200, subscribers)
                        })
                        .catch(error => {
                          const message = error || 'Internal Server Error'
                          logger.serverLog(message, `${TAG}: exports.viewList`, req.body, {user: req.user}, 'error')
                          sendErrorResponse(res, 500, `Failed to fetch list content ${JSON.stringify(error)}`)
                        })
                    })
                    .catch(error => {
                      const message = error || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: exports.viewList`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
                    })
                } else {
                  sendErrorResponse(res, 400, 'No subscribers found')
                }
              })
              .catch(error => {
                const message = error || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.viewList`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to fetch numbers ${JSON.stringify(error)}`)
              })
          } else {
            utility.callApi(`subscribers/query`, 'post', {
              isSubscribed: true, companyId: companyUser.companyId, _id: {$in: list.content}})
              .then(subscribers => {
                sendSuccessResponse(res, 200, subscribers)
              })
              .catch(error => {
                const message = error || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.viewList`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
              })
          }
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.viewList`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch list ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.viewList`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.deleteList = function (req, res) {
  utility.callApi(`lists/${req.params.id}`, 'get', {})
    .then(list => {
      utility.callApi('tags/query', 'post', {companyId: req.user.companyId, tag: list.listName})
        .then(tags => {
          console.log('tags resp', tags)
          if (tags.length > 0) {
            tags.forEach((tag, i) => {
              utility.callApi(`tags_subscriber/query`, 'post', {tagId: tag._id})
                .then(tagsSubscriber => {
                  for (let i = 0; i < tagsSubscriber.length; i++) {
                    utility.callApi(`tags_subscriber/${tagsSubscriber[i]._id}`, 'delete', {})
                      .then(result => {
                      })
                      .catch(err => {
                        const message = err || 'Failed to delete tag subscribers'
                        logger.serverLog(message, `${TAG}: exports.deleteList`, req.body, {user: req.user}, 'error')
                      })
                  }
                })
                .catch(err => {
                  const message = err || 'Failed to fetch tag subscribers'
                  logger.serverLog(message, `${TAG}: exports.deleteList`, req.body, {user: req.user}, 'error')
                })
            })
            async.parallelLimit([
              function (callback) {
                deleteListFromLocal(req, callback)
              },
              function (callback) {
                deleteListFromFacebook(req, tags, callback)
              }
            ], 10, function (err, results) {
              if (err) {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.deleteList`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 50, `Failed to find list ${err}`)
              }
              sendSuccessResponse(res, 200, 'List has been deleted successfully!')
            })
          } else {
            async.parallelLimit([
              function (callback) {
                deleteListFromLocal(req, callback)
              }
            ], 10, function (err, results) {
              if (err) {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.deleteList`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 50, `Failed to find list ${err}`)
              }
              sendSuccessResponse(res, 200, 'List has been deleted successfully!')
            })
          }
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.deleteList`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Failed to find tags ${err}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.deleteList`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to find list ${err}`)
    })
}

function deleteListFromLocal (req, callback) {
  utility.callApi(`lists/${req.params.id}`, 'delete', {})
    .then(result => {
      utility.callApi(`featureUsage/updateCompany`, 'put', {
        query: {companyId: req.user.companyId},
        newPayload: { $inc: { segmentation_lists: -1 } },
        options: {}
      })
        .then(updated => {
          callback(null, {status: 'success', payload: result})
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: deleteListFromLocal`, req.body, {user: req.user}, 'error')
          callback(error)
        })
      updateCompanyUsage(req.user.companyId, 'segmentation_lists', -1)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: deleteListFromLocal`, req.body, {user: req.user}, 'error')
      callback(error)
    })
}

function deleteListFromFacebook (req, tags, callback) {
  tags.forEach((tag, i) => {
    utility.callApi('pages/query', 'post', {_id: tag.pageId})
      .then(pages => {
        let page = pages[0]
        facebookApiCaller('v2.11', `${tag.labelFbId}?access_token=${page.accessToken}`, 'delete', {})
          .then(label => {
            if (label.body.error) {
              sendOpAlert(label.body.error, 'lists controller in kiboengage From deleteListFromFacebook', page._id, page.userId, page.companyId)
              callback(label.error)
            }
            if (i === tags.length - 1) {
              callback(null, 'success')
            }
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: deleteListFromFacebook`, req.body, {user: req.user}, 'error')
            callback(err)
          })
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: deleteListFromFacebook`, req.body, {user: req.user}, 'error')
        callback(err)
      })
  })
}

exports.repliedPollSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      PollDataLayer.genericFindForPolls({companyId: companyUser.companyId})
        .then(polls => {
          let criteria = logicLayer.pollResponseCriteria(polls)
          PollResponseDataLayer.genericFindForPollResponse(criteria)
            .then(responses => {
              let subscriberCriteria = logicLayer.respondedSubscribersCriteria(responses, companyUser.companyId)
              utility.callApi(`subscribers/query`, 'post', subscriberCriteria)
                .then(subscribers => {
                  let subscribersPayload = logicLayer.preparePayload(subscribers, responses)
                  sendSuccessResponse(res, 200, subscribersPayload)
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.repliedPollSubscribers`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch poll responses ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.repliedPollSubscribers`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch polls ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.repliedPollSubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.repliedSurveySubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      SurveyDataLayer.genericFind({companyId: companyUser.companyId})
        .then(surveys => {
          let criteria = logicLayer.pollResponseCriteria(surveys)
          SurveyResponseDataLayer.genericFind(criteria)
            .then(responses => {
              let subscriberCriteria = logicLayer.respondedSubscribersCriteria(responses, companyUser.companyId)
              utility.callApi(`subscribers/query`, 'post', subscriberCriteria)
                .then(subscribers => {
                  let subscribersPayload = logicLayer.preparePayload(subscribers, responses)
                  sendSuccessResponse(res, 200, subscribersPayload)
                })
                .catch(error => {
                  const message = error || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.repliedSurveySubscribers`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.repliedSurveySubscribers`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch survey responses ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.repliedSurveySubscribers`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch surveys ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.repliedSurveySubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
