
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

exports.allLists = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`lists/query`, 'post', { companyId: companyUser.companyId }, req.headers.authorization)
        .then(lists => {
          return res.status(201).json({status: 'success', payload: lists})
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch lists ${JSON.stringify(error)}`
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

exports.getAll = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`lists/aggregate`, 'post', criterias.countCriteria, req.headers.authorization) // fetch lists count
        .then(count => {
          utility.callApi(`lists/aggregate`, 'post', criterias.fetchCriteria, req.headers.authorization) // fetch lists
            .then(lists => {
              res.status(200).json({
                status: 'success',
                payload: {lists: lists, count: count.length > 0 ? count[0].count : 0}
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch lists ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch list count ${JSON.stringify(error)}`
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

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId}, req.headers.authorization)
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
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to create list ${JSON.stringify(err)}`
              })
            }
            assignTagToSubscribers(req.body.content, req.body.listName, req, res)
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
}

function createTag (req, callback) {
  utility.callApi('pages/query', 'post', {companyId: req.user.companyId}, req.headers.authorization)
    .then(pages => {
      pages.forEach((page, i) => {
        let tag = req.body.tag ? req.body.tag : req.body.listName
        facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'name': tag})
          .then(label => {
            console.log('label created', label.body)
            if (label.body.error) {
              callback(label.body.error)
            }
            let tagPayload = {
              tag: req.body.listName,
              userId: req.user._id,
              companyId: req.user.companyId,
              pageId: page._id,
              labelFbId: label.body.id,
              isList: true
            }
            utility.callApi('tags/', 'post', tagPayload, req.headers.authorization)
              .then(newTag => {
                utility.callApi('featureUsage/updateCompany', 'put', {query: {companyId: req.user.companyId}, newPayload: { $inc: { labels: 1 } }, options: {}}, req.headers.authorization)
                  .then(updated => {
                    logger.serverLog(TAG, `Updated Feature Usage ${JSON.stringify(updated)}`)
                  })
                  .catch(err => {
                    if (err) {
                      logger.serverLog(TAG, `ERROR in updating Feature Usage${JSON.stringify(err)}`)
                    }
                  })
                if (i === pages.length - 1) {
                  callback(null, newTag)
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
    parentListName: req.body.parentListName
  }, req.headers.authorization)
    .then(listCreated => {
      utility.callApi(`featureUsage/updateCompany`, 'put', {
        query: {companyId: req.body.companyId},
        newPayload: { $inc: { segmentation_lists: 1 } },
        options: {}
      }, req.headers.authorization)
        .then(updated => {
          callback(null, 'success')
        })
        .catch(error => callback(error))
    })
    .catch(error => callback(error))
}

exports.editList = function (req, res) {
  utility.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.listName}, req.headers.authorization)
    .then(tags => {
      tags.forEach((tag, i) => {
        utility.callApi('pages/query', 'post', {_id: tag.pageId}, req.headers.authorization)
          .then(pages => {
            let page = pages[0]
            facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.accessToken}`, 'post', {'label': req.body.newTag})
              .then(label => {
                if (label.body.error) {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Failed to create tag on Facebook ${JSON.stringify(label.body.error)}`
                  })
                }
                let data = {
                  listName: req.body.newListName,
                  conditions: req.body.conditions,
                  content: req.body.content
                }
                async.parallelLimit([
                  function (callback) {
                    updateList(data, req, callback)
                  }
                ], 10, function (err, results) {
                  if (err) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Failed to create tag on Facebook ${JSON.stringify(label.error)}`
                    })
                  }
                  if (i === tags.length - 1) {
                    utility.callApi('tags_subscriber/query', 'post', {companyId: req.user.companyId, tag: req.body.listName}, req.headers.authorization)
                      .then(tagSubscribers => {
                        let subscribers = tagSubscribers.map((ts) => ts.subscriberId._id)
                        assignTagToSubscribers(subscribers, req.body.listName, req, res)
                      })
                      .catch(err => {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Failed to create tag on Facebook ${JSON.stringify(err)}`
                        })
                      })
                  }
                })
              })
              .catch(error => {
                return res.status(500).json({
                  status: 'failed',
                  payload: `Failed to create tag on Facebook ${JSON.stringify(error)}`
                })
              })
          })
          .catch(error => {
            return res.status(500).json({
              status: 'failed',
              payload: `Failed to fetch page ${JSON.stringify(error)}`
            })
          })
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch tags ${JSON.stringify(error)}`
      })
    })
}

function updateList (data, req, callback) {
  utility.callApi(`lists/update`, 'post', {query: {companyId: req.user.companyId, listName: req.body.listName}, newPayload: data, options: {}}, req.headers.authorization)
    .then(savedList => {
      callback(null, savedList)
    })
    .catch(error => {
      callback(error)
    })
}

exports.viewList = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      utility.callApi(`lists/${req.params.id}`, 'get', {}, req.headers.authorization)
        .then(list => {
          if (list.initialList === true) {
            utility.callApi(`phone/query`, 'post', {
              companyId: companyUser.companyId,
              hasSubscribed: true,
              fileName: { $all: [list.listName] },
              pageId: { $exists: true, $ne: null }
            }, req.headers.authorization)
              .then(number => {
                if (number.length > 0) {
                  let criterias = logicLayer.getSubscriberCriteria(number, companyUser)
                  console.log('Criterias', criterias)
                  utility.callApi(`subscribers/query`, 'post', criterias, req.headers.authorization)
                    .then(subscribers => {
                      console.log('Subscribers', subscribers)
                      let content = logicLayer.getContent(subscribers)
                      utility.callApi(`lists/${req.params.id}`, 'put', {
                        content: content
                      }, req.headers.authorization)
                        .then(savedList => {
                          return res.status(201).json({status: 'success', payload: subscribers})
                        })
                        .catch(error => {
                          return res.status(500).json({
                            status: 'failed',
                            payload: `Failed to fetch list content ${JSON.stringify(error)}`
                          })
                        })
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
                      })
                    })
                } else {
                  return res.status(500).json({
                    status: 'failed',
                    description: 'No subscribers found'
                  })
                }
              })
              .catch(error => {
                return res.status(500).json({
                  status: 'failed',
                  payload: `Failed to fetch numbers ${JSON.stringify(error)}`
                })
              })
          } else {
            utility.callApi(`subscribers/query`, 'post', {
              isSubscribed: true, companyId: companyUser.companyId, _id: {$in: list.content}}, req.headers.authorization)
              .then(subscribers => {
                return res.status(201)
                  .json({status: 'success', payload: subscribers})
              })
              .catch(error => {
                return res.status(500).json({
                  status: 'failed',
                  payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
                })
              })
          }
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch list ${JSON.stringify(error)}`
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
exports.deleteList = function (req, res) {
  utility.callApi('tags/query', 'post', {companyId: req.user.companyId, tag: req.body.listName}, req.headers.authorization)
    .then(tags => {
      if (tags.length > 0) {
        tags.forEach((tag, i) => {
          utility.callApi(`tags_subscriber/query`, 'post', {tagId: tag._id}, req.headers.authorization)
            .then(tagsSubscriber => {
              for (let i = 0; i < tagsSubscriber.length; i++) {
                utility.callApi(`tags_subscriber/${tagsSubscriber[i]._id}`, 'delete', {}, req.headers.authorization)
                  .then(result => {
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to delete tag subscriber ${JSON.stringify(err)}`)
                  })
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch tag subscribers ${JSON.stringify(err)}`)
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
            return res.status(404).json({
              status: 'failed',
              description: `Failed to find list ${err}`
            })
          }
          res.status(200).json({status: 'success', payload: 'List has been deleted successfully!'})
        })
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'Tag not found'
        })
      }
    })
    .catch(err => {
      return res.status(404).json({
        status: 'failed',
        description: `Failed to find tags ${err}`
      })
    })
}

function deleteListFromLocal (req, callback) {
  utility.callApi(`lists/${req.params.id}`, 'delete', {}, req.headers.authorization)
    .then(result => {
      utility.callApi(`featureUsage/updateCompany`, 'put', {
        query: {companyId: req.user.companyId},
        newPayload: { $inc: { segmentation_lists: -1 } },
        options: {}
      }, req.headers.authorization)
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
    utility.callApi('pages/query', 'post', {_id: tag.pageId}, req.headers.authorization)
      .then(pages => {
        let page = pages[0]
        facebookApiCaller('v2.11', `me/${tag.labelFbId}?access_token=${page.accessToken}`, 'delete', {})
          .then(label => {
            if (label.error) {
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
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      PollDataLayer.genericFindForPolls({companyId: companyUser.companyId})
        .then(polls => {
          let criteria = logicLayer.pollResponseCriteria(polls)
          PollResponseDataLayer.genericFindForPollResponse(criteria)
            .then(responses => {
              let subscriberCriteria = logicLayer.respondedSubscribersCriteria(responses, companyUser.companyId)
              utility.callApi(`subscribers/query`, 'post', subscriberCriteria, req.headers.authorization)
                .then(subscribers => {
                  let subscribersPayload = logicLayer.preparePayload(subscribers, responses)
                  return res.status(200).json({status: 'success', payload: subscribersPayload})
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
                payload: `Failed to fetch poll responses ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch polls ${JSON.stringify(error)}`
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
exports.repliedSurveySubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      SurveyDataLayer.genericFind({companyId: companyUser.companyId})
        .then(surveys => {
          let criteria = logicLayer.pollResponseCriteria(surveys)
          SurveyResponseDataLayer.genericFind(criteria)
            .then(responses => {
              let subscriberCriteria = logicLayer.respondedSubscribersCriteria(responses, companyUser.companyId)
              utility.callApi(`subscribers/query`, 'post', subscriberCriteria, req.headers.authorization)
                .then(subscribers => {
                  let subscribersPayload = logicLayer.preparePayload(subscribers, responses)
                  return res.status(200).json({status: 'success', payload: subscribersPayload})
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
                payload: `Failed to fetch survey responses ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch surveys ${JSON.stringify(error)}`
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
  let tags = []
  subscribers.forEach((subscriberId, i) => {
    utility.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization)
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          let tagPayload = tags[existsTag.index]
          facebookApiCaller('v2.11', `me/${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
            .then(assignedLabel => {
              if (assignedLabel.body.error) {
                res.status(500).json({status: 'failed', payload: `Failed to associate tag to subscriber ${assignedLabel.body.error}`})
              }
              let subscriberTagsPayload = {
                tagId: tagPayload._id,
                subscriberId: subscriber._id,
                companyId: req.user.companyId
              }
              utility.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload, req.headers.authorization)
                .then(newRecord => {
                  if (i === subscribers.length - 1) {
                    res.status(200).json({status: 'success', payload: 'List created successfully!'})
                  }
                })
                .catch(err => {
                  res.status(500).json({status: 'failed', payload: `Failed to assign tag to subscriber ${err}`})
                })
            })
            .catch(err => {
              res.status(500).json({status: 'failed', payload: `Failed to associate tag to subscriber ${err}`})
            })
        } else {
          utility.callApi('tags/query', 'post', {tag, pageId: subscriber.pageId._id}, req.headers.authorization)
            .then(tagPayload => {
              tags.push(tagPayload)
              facebookApiCaller('v2.11', `me/${tagPayload.labelFbId}/label?access_token=${subscriber.pageId.accessToken}`, 'post', {'user': subscriber.senderId})
                .then(assignedLabel => {
                  if (assignedLabel.body.error) {
                    res.status(500).json({status: 'failed', payload: `Failed to associate tag to subscriber ${assignedLabel.body.error}`})
                  }
                  let subscriberTagsPayload = {
                    tagId: tagPayload._id,
                    subscriberId: subscriber._id,
                    companyId: req.user.companyId
                  }
                  utility.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload, req.headers.authorization)
                    .then(newRecord => {
                      if (i === subscribers.length - 1) {
                        res.status(200).json({status: 'success', payload: 'List created successfully!'})
                      }
                    })
                    .catch(err => {
                      res.status(500).json({status: 'failed', payload: `Failed to associate tag to subscriber ${err}`})
                    })
                })
                .catch(err => {
                  res.status(500).json({status: 'failed', payload: `Failed to associate tag to subscriber ${err}`})
                })
            })
            .catch(err => {
              res.status(500).json({status: 'failed', payload: `Failed to associate tag to subscriber ${err}`})
            })
        }
      })
      .catch(err => {
        res.status(500).json({status: 'failed', payload: `Failed to associate tag to subscriber ${err}`})
      })
  })
}
