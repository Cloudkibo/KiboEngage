const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/backdoor/backdoor.controller'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const async = require('async')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const needle = require('needle')

exports.getPagePermissions = function (req, res) {
  let recentPageCriteria = [
    {$match: {pageId: req.params.id}},
    {$sort: {_id: -1}},
    {$limit: 1},
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { '$unwind': '$user' }
  ]
  utility.callApi(`pages/aggregate`, 'post', recentPageCriteria, 'accounts', req.headers.authorization)
    .then(page => {
      page = page[0]
      if (page) {
        utility.callApi(`user/query`, 'post', {email: 'anisha@cloudkibo.com'}, 'accounts', req.headers.authorization)
          .then(user => {
            user = user[0]
            let appLevelPermissions = {
              email: false,
              manage_pages: false,
              pages_show_list: false,
              publish_pages: false,
              pages_messaging: false,
              pages_messaging_phone_number: false,
              pages_messaging_subscriptions: false,
              public_profile: false
            }
            let pageLevelPermissions = {
              subscription_messaging: 'Not Applied'
            }
            async.parallelLimit([
              function (callback) {
                facebookApiCaller('v4.0', `debug_token?input_token=${page.accessToken}&access_token=${user.facebookInfo.fbToken}`, 'get', {})
                  .then(response => {
                    logger.serverLog(TAG, `response from debug token ${response.body}`)
                    if (response.body && response.body.data && response.body.data.scopes) {
                      if (response.body.data.scopes.length > 0) {
                        for (let i = 0; i < response.body.data.scopes.length; i++) {
                          appLevelPermissions[`${response.body.data.scopes[i]}`] = true
                          if (i === response.body.data.scopes.length - 1) {
                            callback(null, appLevelPermissions)
                          }
                        }
                      } else {
                        callback(null, appLevelPermissions)
                      }
                    } else {
                      callback(response.body.error)
                    }
                  })
                  .catch(err => {
                    callback(err)
                  })
              },
              function (callback) {
                facebookApiCaller('v4.0', `me/messaging_feature_review?access_token=${page.accessToken}`, 'get', {})
                  .then(response => {
                    logger.serverLog(TAG, `response from messaging_feature_review ${response.body}`)
                    if (response.body && response.body.data) {
                      if (response.body.data.length > 0) {
                        for (let i = 0; i < response.body.data.length; i++) {
                          pageLevelPermissions[`${response.body.data[i].feature}`] = response.body.data[i].status
                          if (i === response.body.data.length - 1) {
                            callback(null, pageLevelPermissions)
                          }
                        }
                      } else {
                        callback(null, pageLevelPermissions)
                      }
                    } else {
                      callback(response.body.error)
                    }
                  })
                  .catch(err => {
                    callback(err)
                  })
              }
            ], 10, function (err, results) {
              if (err) {
                sendErrorResponse(res, 500, `Failed to fetch page permissions ${JSON.stringify(err)}`)
              } else {
                sendSuccessResponse(res, 200, {appLevelPermissions: results[0], pageLevelPermissions: results[1]})
              }
            })
          })
          .catch(error => {
            sendErrorResponse(res, 500, `Failed to fetch user ${JSON.stringify(error)}`)
          })
      } else {
        sendErrorResponse(res, 500, `Failed to fetch permissions ${JSON.stringify({message: `This page is not connected by any User. So, we cannot fetch this page's permissions`})}`)
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
    })
}
exports.fetchPageUsers = (req, res) => {
  async.parallelLimit([
    function (callback) {
      let recentPageCriteria = [
        {$match: {pageId: req.body.pageId}},
        {$sort: {_id: -1}},
        {$limit: 1},
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { '$unwind': '$user' }
      ]
      utility.callApi(`pages/aggregate`, 'post', recentPageCriteria, 'accounts', req.headers.authorization)
        .then(connectedPage => {
          connectedPage = connectedPage[0]
          facebookApiCaller('v4.0', `${req.body.pageId}?fields=access_token&access_token=${connectedPage.user.facebookInfo.fbToken}`, 'get', {})
            .then(response => {
              if (response.body && response.body.access_token) {
                facebookApiCaller('v4.0', `${req.body.pageId}/roles?access_token=${response.body.access_token}`, 'get', {})
                  .then(resp => {
                    if (resp.body && resp.body.data) {
                      callback(null, resp.body.data)
                    } else if (resp.body && resp.body.error) {
                      callback(null, [])
                    }
                  })
                  .catch(err => {
                    callback(err)
                  })
              } else if (response.body && response.body.error) {
                callback(null, [])
              }
            })
            .catch(err => {
              callback(err)
            })
        })
        .catch(err => {
          callback(err)
        })
    }, function (callback) {
      let criterias = LogicLayer.getPageUsersCriteria(req.body)
      utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria, 'accounts', req.headers.authorization)
        .then(pagesCount => {
          utility.callApi(`pages/aggregate`, 'post', criterias.finalCriteria, 'accounts', req.headers.authorization)
            .then(pageUsers => {
              callback(null, {count: pagesCount[0] ? pagesCount[0].count : 0, pageUsers: pageUsers})
            })
            .catch(err => {
              sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to fetch page count ${JSON.stringify(err)}`)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, `Failed to fetch page users ${err}`)
    } else {
      getAdminedData(results[0], results[1])
        .then(result => {
          if (req.body.admin_filter === true) {
            result.pageUsers = result.pageUsers.filter((c) => c.admin === true)
            result.count = result.pageUsers.length
          } else if (req.body.admin_filter === false) {
            result.pageUsers = result.pageUsers.filter((c) => c.admin === false)
            result.count = result.pageUsers.length
          }
          sendSuccessResponse(res, 200, {count: result.count, pageUsers: result.pageUsers})
        })
    }
  })
}
function getAdminedData (fbRoles, localDataFromDB) {
  return new Promise(function (resolve, reject) {
    let roles = []
    if (fbRoles.length > 0) {
      roles = fbRoles.map(role => role.name)
    }
    let localData = localDataFromDB.pageUsers
    if (localData.length > 0) {
      for (let i = 0; i < localData.length; i++) {
        if (localData[i].user.facebookInfo && roles.indexOf(localData[i].user.facebookInfo.name) > -1) {
          localData[i].admin = true
        } else {
          localData[i].admin = false
        }
        if (i === localData.length - 1) {
          resolve({count: localDataFromDB.count, pageUsers: localData})
        }
      }
    } else {
      resolve({count: 0, pageUsers: []})
    }
  })
}

exports.fetchPageTags = (req, res) => {
  let aggregation = [
    {
      '$match': {'pageId': req.params.pageId}
    },
    {
      '$lookup': {
        from: 'tags',
        localField: '_id',
        foreignField: 'pageId',
        as: 'tag'
      }
    },
    {
      '$unwind': '$tag'
    },
    {
      '$group': {
        '_id': '$pageId',
        'pageName': {'$first': '$pageName'},
        'accessToken': {'$first': '$accessToken'},
        'tags': {'$push': '$tag'}
      }
    },
    {
      '$project': {
        '_id': 0,
        'pageId': '$_id',
        'pageName': 1,
        'tags': 1,
        'accessToken': 1
      }
    }
  ]
  utility.callApi(`pages/aggregate`, 'post', aggregation, 'accounts', req.headers.authorization)
    .then(kiboPageTags => {
      if (kiboPageTags && kiboPageTags[0]) {
        needle.get(
          `https://graph.facebook.com/v4.0/me/custom_labels?fields=name&access_token=${kiboPageTags[0].accessToken}`,
          (err, resp) => {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Failed to fetch facebook labels for page ${req.params.pageId} ${err}`
              })
            } else {
              return res.status(200).json({
                status: 'success',
                payload: {
                  kiboPageTags: kiboPageTags[0].tags,
                  fbPageTags: resp.body.data ? resp.body.data : []
                }
              })
            }
          })
      } else {
        let backupAggregation = [
          {
            '$match': {'pageId': req.params.pageId}
          },
          {
            '$group': {
              '_id': '$pageId',
              'pageName': {'$first': '$pageName'},
              'accessToken': {'$first': '$accessToken'}
            }
          },
          {
            '$project': {
              '_id': 0,
              'pageId': '$_id',
              'pageName': 1,
              'accessToken': 1
            }
          }
        ]
        utility.callApi(`pages/aggregate`, 'post', backupAggregation, 'accounts', req.headers.authorization)
          .then(pageInfo => {
            pageInfo = pageInfo[0]
            needle.get(
              `https://graph.facebook.com/v4.0/me/custom_labels?fields=name&access_token=${pageInfo.accessToken}`,
              (err, resp) => {
                if (err) {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Failed to fetch facebook labels for page ${req.params.pageId} ${err}`
                  })
                } else {
                  return res.status(200).json({
                    status: 'success',
                    payload: {
                      kiboPageTags: [],
                      fbPageTags: resp.body.data ? resp.body.data : []
                    }
                  })
                }
              })
          })
          .catch(err => {
            return res.status(500).json({
              status: 'failed',
              description: `Failed to fetch page info ${err}`
            })
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch unique pages ${err}`, 'debug')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch unique pages ${err}`
      })
    })
}
exports.fetchSubscribersWithTagsNew = (req, res) => {
  let subscriberData = []
  utility.callApi(`pages/query`, 'post', {pageId: req.body.pageId, userId: req.body.pageOwner}, 'accounts', req.headers.authorization)
    .then(pages => {
      let page = pages[0]
      req.body.page_id = page._id
      req.body.accessToken = page.accessToken
      getPageTags(req)
        .then(pageTags => {
          if (pageTags[0]) {
            return _fetchSubscribersWithTagsNew(req, res, 0, pageTags[0].tags, subscriberData)
          } else {
            return _fetchSubscribersWithTagsNew(req, res, [], subscriberData)
          }
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Failed to fetch page tags  ${err}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch page  ${err}`
      })
    })
}

function _fetchSubscribersWithTagsNew (req, res, skip, pageTags, results) {
  get10PageSubscribers(req, (req.body.pageNumber - 1) * 10)
    .then(subscribers => {
      if (subscribers) {
        filterSubscribers(req, res, subscribers, pageTags, results)
          .then(filteredSubscribers => {
            if (results.length < 10 && subscribers.length >= 10) {
              skip += 10
              _fetchSubscribersWithTagsNew(req, res, skip, pageTags, results)
            } else {
              return res.status(200).json({
                status: 'success',
                payload: {
                  subscriberData: results
                }
              })
            }
          })
          .catch(err => {
            return res.status(500).json({
              status: 'failed',
              description: `Failed to filter subscribers  ${err}`
            })
          })
      } else {
        return res.status(200).json({
          status: 'success',
          payload: {
            subscriberData: []
          }
        })
      }
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch subscribers  ${err}`
      })
    })
}

exports.fetchPageAdmins = (req, res) => {
  let pageAggregation = [
    {$match: {pageId: req.params.pageId}},
    {$sort: {_id: -1}},
    {$limit: 1}
  ]
  utility.callApi(`pages/aggregate`, 'post', pageAggregation, 'accounts', req.headers.authorization)
    .then(page => {
      page = page[0]
      facebookApiCaller('v4.0', `${req.params.pageId}/roles?access_token=${page.accessToken}`, 'get', {})
        .then(resp => {
          if (resp.body && resp.body.data) {
            return res.status(200).json({
              status: 'success',
              payload: resp.body.data
            })
          }
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Failed to fetch page admins ${err}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch page ${err}`
      })
    })
}
function getPageTags (req) {
  let pageTagsAggregation = [
    {
      '$match': {pageId: req.body.pageId}
    },
    {
      '$lookup': {
        from: 'tags',
        localField: '_id',
        foreignField: 'pageId',
        as: 'tag'
      }
    },
    {
      '$unwind': '$tag'
    },
    {
      '$group': {
        '_id': '$pageId',
        'tags': {'$addToSet': '$tag'}
      }
    },
    {
      '$project': {
        '_id': 0,
        'pageId': '$_id',
        'tags': 1
      }
    }
  ]
  return utility.callApi(`pages/aggregate`, 'post', pageTagsAggregation, 'accounts', req.headers.authorization)
}
function filterSubscribers (req, res, subscribers, pageTags, subscriberData) {
  return new Promise((resolve, reject) => {
    if (pageTags.length === 0) {
      let statusFilterSucceeded = true
      if (req.body.status) {
        if (req.body.status === 'correct') {
          statusFilterSucceeded = true
        } else {
          statusFilterSucceeded = false
        }
      }
      if (statusFilterSucceeded && !req.body.assignedTag && !req.body.unassignedTag) {
        for (let i = 0; subscriberData.length < 10 && i < subscribers.length; i++) {
          retrievedSubscriberData += 1
          subscriberData.push({
            subscriber: subscribers[i],
            assignedTags: [],
            unassignedTags: []
          })
        }
        resolve(subscriberData)
      } else {
        resolve([])
      }
    } else {
      let requests = []
      for (let i = 0; subscriberData.length < 10 && i < subscribers.length; i++) {
        requests.push((callback) => {
          needle.get(
            `https://graph.facebook.com/v4.0/${subscribers[i].senderId}/custom_labels?fields=name&access_token=${req.body.accessToken}`,
            (err, resp) => {
              if (err) {
                logger.serverLog(TAG, `Failed to fetch facebook labels for subscriber ${subscribers[i].senderId} ${err}`, 'debug')
                callback(null, {
                  subscriber: subscribers[i],
                  assignedTags: [],
                  unassignedTags: pageTags
                })
                // callback(`Failed to fetch facebook labels for subscriber ${subscribers[i].senderId} ${err}`)
              } else {
                logger.serverLog(TAG, `fbSubscriberTags ${i} ${JSON.stringify(resp.body.data)}`, 'debug')
                logger.serverLog(TAG, `kiboPageTags ${JSON.stringify(pageTags)}`, 'debug')
                let fbTags = resp.body.data
                let kiboPageTags = pageTags
                let assignedTags = []
                let unassignedTags = []
                let tagAssigned = false
                if (fbTags) {
                  for (let j = 0; j < kiboPageTags.length; j++) {
                    for (let k = 0; k < fbTags.length; k++) {
                      if (fbTags[k].id === kiboPageTags[j].labelFbId) {
                        assignedTags.push(kiboPageTags[j])
                        tagAssigned = true
                        break
                      }
                    }
                    if (!tagAssigned) {
                      if (kiboPageTags[j].tag === 'male' || kiboPageTags[j].tag === 'female' || kiboPageTags[j].tag === 'other') {
                        if (kiboPageTags[j].tag === subscribers[i].gender) {
                          unassignedTags.push(kiboPageTags[j])
                        }
                      } else {
                        unassignedTags.push(kiboPageTags[j])
                      }
                    } else {
                      tagAssigned = false
                    }
                  }
                } else {
                  for (let j = 0; j < kiboPageTags.length; j++) {
                    if (kiboPageTags[j].tag === 'male' || kiboPageTags[j].tag === 'female' || kiboPageTags[j].tag === 'other') {
                      if (kiboPageTags[j].tag === subscribers[i].gender) {
                        unassignedTags.push(kiboPageTags[j])
                      }
                    } else {
                      unassignedTags.push(kiboPageTags[j])
                    }
                  }
                }
                let filteredAssignedTags = assignedTags.filter(x => {
                  let tagName = x.tag
                  if (tagName.toLowerCase().includes(req.body.assignedTag.toLowerCase())) {
                    return true
                  }
                })
                let filteredUnassignedTags = unassignedTags.filter(x => {
                  let tagName = x.tag
                  if (tagName.toLowerCase().includes(req.body.unassignedTag.toLowerCase())) {
                    return true
                  }
                })
                let assignedTagsFound = false
                let unassignedTagsFound = false
                if (assignedTags.length > 0) {
                  if (filteredAssignedTags.length > 0) {
                    assignedTagsFound = true
                  }
                } else {
                  assignedTagsFound = true
                }

                if (unassignedTags.length > 0) {
                  if (filteredUnassignedTags.length > 0) {
                    unassignedTagsFound = true
                  }
                } else {
                  unassignedTagsFound = true
                }

                let statusFilterSucceeded = true
                if (req.body.status) {
                  if (req.body.status === 'incorrect' && filteredUnassignedTags.length > 0) {
                    statusFilterSucceeded = true
                  } else if (req.body.status === 'correct' && filteredUnassignedTags.length === 0) {
                    statusFilterSucceeded = true
                  } else {
                    statusFilterSucceeded = false
                  }
                }

                if (assignedTagsFound && unassignedTagsFound && statusFilterSucceeded) {
                  callback(null, {
                    subscriber: subscribers[i],
                    assignedTags: assignedTags,
                    unassignedTags: unassignedTags
                  })
                } else {
                  callback(null, null)
                }
              }
            })
        })
      }
      async.parallelLimit(requests, 30, function (err, results) {
        if (err) {
          reject(`Failed to fetch facebook tags ${err}`)
        } else {
          for (let i = 0; subscriberData.length < 10 && i < results.length; i++) {
            if (results[i]) {
              subscriberData.push(results[i])
            }
          }
          resolve(subscriberData)
        }
      })
    }
  })
}

function get10PageSubscribers (req, skip) {
  let aggregation = [
    {
      '$match': {pageId: req.body.page_id, completeInfo: true}
    },
    {
      '$sort': {'_id': -1}
    },
    {
      '$group': {
        '_id': '$_id',
        'firstName': {'$first': '$firstName'},
        'lastName': {'$first': '$lastName'},
        'senderId': {'$first': '$senderId'},
        'gender': {'$first': '$gender'}
      }
    },
    {
      '$project': {
        '_id': 1,
        'firstName': 1,
        'lastName': 1,
        'fullName': { $concat: [ '$firstName', ' ', '$lastName' ] },
        'senderId': 1,
        'gender': 1
      }
    },
    {
      '$match': { fullName: { $regex: '.*' + req.body.subscriberName + '.*', $options: 'i' } }
    },
    {'$skip': skip || 0},
    {'$limit': 10}
  ]
  return utility.callApi(`subscribers/aggregate`, 'post', aggregation, 'accounts', req.headers.authorization)
}
exports.fetchPageOwners = (req, res) => {
  let aggregation = [
    {
      '$match': {'pageId': req.params.pageId}
    },
    {
      '$lookup': {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      '$unwind': '$user'
    },
    {
      '$group': {
        '_id': '$pageId',
        'users': {'$addToSet': '$user'}
      }
    },
    {
      '$project': {
        '_id': 0,
        'pageId': '$_id',
        'users': 1
      }
    }
  ]
  utility.callApi(`pages/aggregate`, 'post', aggregation, 'accounts', req.headers.authorization)
    .then(pageOwners => {
      return res.status(200).json({
        status: 'success',
        payload: pageOwners[0].users

      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch page owners for page ${req.params.pageId} ${err}`
      })
    })
}
