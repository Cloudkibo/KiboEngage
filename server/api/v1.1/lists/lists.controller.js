
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
          sendErrorResponse(res, 500, `Failed to fetch lists ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
              sendErrorResponse(res, 500, `Failed to fetch lists ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch list count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan._id})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          // add paid plan check later
          // if (planUsage.segmentation_lists !== -1 && companyUsage.segmentation_lists >= planUsage.segmentation_lists) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your lists limit has reached. Please upgrade your plan to premium in order to create more lists.`
          //   })
          // }
          async.parallelLimit([
            function (callback) {
              createList(req, callback)
            },
            function (callback) {
              createTag(req, callback)
            }
          ], 10, function (err, results) {
            if (err) {
              sendErrorResponse(res, 500, `Failed to create list ${JSON.stringify(err)}`)
            } else {
              logger.serverLog(TAG, 'assigning tag to subscribers', 'debug')
              assignTagToSubscribers(req.body.content, req.body.listName, req, res)
            }
          })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to plan usage ${JSON.stringify(error)}`)
    })
}

function createTag (req, callback) {
  utility.callApi('pages/query', 'post', {companyId: req.user.companyId})
    .then(pages => {
      let tagsCreated = 0
      pages.forEach((page, i) => {
        let tag = req.body.listName
        facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'name': tag})
          .then(label => {
            if (label.body.error) {
              logger.serverLog(TAG, `facebook label error ${label.body.error}`, 'debug')
              sendOpAlert(label.body.error, 'lists controller in kiboengage from createTag', page._id, page.userId, page.companyId)
              return callback(label.body.error)
            }
            let tagPayload = {
              tag: req.body.listName,
              userId: req.user._id,
              companyId: req.user.companyId,
              pageId: page._id,
              labelFbId: label.body.id,
              isList: true
            }
            utility.callApi('tags/', 'post', tagPayload)
              .then(newTag => {
                utility.callApi('featureUsage/updateCompany', 'put', {query: {companyId: req.user.companyId}, newPayload: { $inc: { labels: 1 } }, options: {}})
                  .then(updated => {
                    tagsCreated++
                    logger.serverLog(TAG, `Updated Feature Usage ${JSON.stringify(updated)}`, 'debug')
                  })
                  .catch(err => {
                    if (err) {
                      logger.serverLog(TAG, `ERROR in updating Feature Usage${JSON.stringify(err)}`, 'error')
                    }
                  })
                if (tagsCreated === pages.length) {
                  logger.serverLog(TAG, 'new tag created', 'debug')
                  return callback(null, newTag)
                }
              })
              .catch(err => callback(err))
          })
          .catch(err => callback(err))
      })
    })
    .catch(err => callback(err))
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
        .catch(error => callback(error))
    })
    .catch(error => callback(error))
}

exports.editList = function (req, res) {
  if (req.body.newListName !== req.body.listName) {
    utility.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.listName})
      .then(tags => {
        tags.forEach((tag, i) => {
          utility.callApi('pages/query', 'post', {_id: tag.pageId})
            .then(pages => {
              let page = pages[0]
              let label = req.body.newListName
              facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'name': label})
                .then(label => {
                  if (label.body.error) {
                    sendOpAlert(label.body.error, 'lists controller in kiboengage from editList', page._id, page.userId, page.companyId)
                    sendErrorResponse(res, 500, '', `Failed to create tag on Facebook ${JSON.stringify(label.body.error)}`)
                  }
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
                      sendErrorResponse(res, 500, '', `Failed to create tag on Facebook ${JSON.stringify(label.error)}`)
                    }
                    if (i === tags.length - 1) {
                      utility.callApi('tags_subscriber/query', 'post', {companyId: req.user.companyId, tag: req.body.listName})
                        .then(tagSubscribers => {
                          let subscribers = tagSubscribers.map((ts) => ts.subscriberId._id)
                          if (subscribers.length > 0) {
                            assignTagToSubscribers(subscribers, req.body.listName, req, res)
                          } else {
                            sendSuccessResponse(res, 200, 'List updated successfully!')
                          }
                        })
                        .catch(err => {
                          sendErrorResponse(res, 500, '', `Failed to create tag on Facebook ${JSON.stringify(err)}`)
                        })
                    }
                  })
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to create tag on Facebook ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
            })
        })
      })
      .catch(error => {
        sendErrorResponse(res, 500, `Failed to fetch tags ${JSON.stringify(error)}`)
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
                          sendErrorResponse(res, 500, `Failed to fetch list content ${JSON.stringify(error)}`)
                        })
                    })
                    .catch(error => {
                      sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
                    })
                } else {
                  sendErrorResponse(res, 500, 'No subscribers found')
                }
              })
              .catch(error => {
                sendErrorResponse(res, 500, `Failed to fetch numbers ${JSON.stringify(error)}`)
              })
          } else {
            utility.callApi(`subscribers/query`, 'post', {
              isSubscribed: true, companyId: companyUser.companyId, _id: {$in: list.content}})
              .then(subscribers => {
                sendSuccessResponse(res, 200, subscribers)
              })
              .catch(error => {
                sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
              })
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch list ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.deleteList = function (req, res) {
  utility.callApi(`lists/${req.params.id}`, 'get', {})
    .then(list => {
      console.log('list', list)
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
                        logger.serverLog(TAG, `Failed to delete tag subscriber ${JSON.stringify(err)}`, 'error')
                      })
                  }
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to fetch tag subscribers ${JSON.stringify(err)}`, 'error')
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
                sendErrorResponse(res, 50, `Failed to find list ${err}`)
              }
              sendSuccessResponse(res, 200, 'List has been deleted successfully!')
            })
          } else {
            sendErrorResponse(res, 404, '', 'Tag not found')
          }
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Failed to find tags ${err}`)
        })
    })
    .catch(err => {
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
          callback(error)
        })
    })
    .catch(error => {
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
            callback(err)
          })
      })
      .catch(err => {
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
              sendErrorResponse(res, 500, `Failed to fetch poll responses ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch polls ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
                  sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch survey responses ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch surveys ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

function isTagExists (pageId, tags) {
  let temp = tags.map((t) => t.pageId)
  let index = temp.indexOf(pageId)
  if (index > -1) {
    return {status: true, index}
  } else {
    return {status: false}
  }
}

function assignTagToSubscribers (subscribers, tag, req, res) {
  logger.serverLog(TAG, `assignTagToSubscribers`, 'debug')
  let tags = []
  subscribers.forEach((subscriberId, i) => {
    utility.callApi(`subscribers/${subscriberId}`, 'get', {})
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          logger.serverLog(TAG, 'existsTag.status', 'debug')
          let tagPayload = tags[existsTag.index]
          facebookApiCaller('v2.11', `${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
            .then(assignedLabel => {
              if (assignedLabel.body.error) {
                sendOpAlert(assignedLabel.body.error, 'lists controller in kiboengage from assignTagToSubscribers1', '', req.user.companyId, req.user._id)
                sendErrorResponse(res, 500, `Failed to associate tag to subscriber ${assignedLabel.body.error}`)
              }
              let subscriberTagsPayload = {
                tagId: tagPayload._id,
                subscriberId: subscriber._id,
                companyId: req.user.companyId
              }
              utility.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
                .then(newRecord => {
                  if (i === subscribers.length - 1) {
                    sendSuccessResponse(res, 200, 'List created successfully!')
                  }
                })
                .catch(err => {
                  sendErrorResponse(res, 500, `Failed to assign tag to subscriber ${err}`)
                })
            })
            .catch(err => {
              sendErrorResponse(res, 500, `Failed to associate tag to subscriber ${err}`)
            })
        } else {
          logger.serverLog(TAG, `tags/query ${JSON.stringify({tag, pageId: subscriber.pageId._id, companyId: req.user.companyId})}`, 'debug')
          utility.callApi('tags/query', 'post', {tag, pageId: subscriber.pageId._id, companyId: req.user.companyId})
            .then(tagPayload => {
              logger.serverLog(TAG, `tagPayload ${JSON.stringify(tagPayload)}`)
              tagPayload = tagPayload[0]
              tags.push(tagPayload)
              facebookApiCaller('v2.11', `${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
                .then(assignedLabel => {
                  if (assignedLabel.body.error) {
                    sendOpAlert(assignedLabel.body.error, 'lists controller in kiboengage from assignTagToSubscribers2', '', req.user.companyId, req.user._id)
                    sendErrorResponse(res, 500, `Failed to associate tag to subscriber ${assignedLabel.body.error}`)
                  }
                  let subscriberTagsPayload = {
                    tagId: tagPayload._id,
                    subscriberId: subscriber._id,
                    companyId: req.user.companyId
                  }
                  utility.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
                    .then(newRecord => {
                      if (i === subscribers.length - 1) {
                        sendSuccessResponse(res, 200, 'List created successfully!')
                      }
                    })
                    .catch(err => {
                      sendErrorResponse(res, 500, `Failed to associate tag to subscriber ${err}`)
                    })
                })
                .catch(err => {
                  sendErrorResponse(res, 500, `Failed to associate tag to subscriber ${err}`)
                })
            })
            .catch(err => {
              sendErrorResponse(res, 500, `Failed to associate tag to subscriber ${err}`)
            })
        }
      })
      .catch(err => {
        sendErrorResponse(res, 500, `Failed to associate tag to subscriber ${err}`)
      })
  })
}
