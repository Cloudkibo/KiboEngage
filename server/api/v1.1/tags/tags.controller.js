/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const TAG = 'api/tags/tags.controller.js'
const callApi = require('../utility')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const async = require('async')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('tags/query', 'post', {companyId: companyUser.companyId}, req.headers.authorization)
        .then(tags => {
          res.status(200).json({status: 'success', payload: tags})
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error in fetching tags${JSON.stringify(err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error in fetching customer${JSON.stringify(err)}`
        })
      }
    })
}

exports.create = function (req, res) {
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId}, req.headers.authorization)
        .then(companyUsage => {
          // add paid plan check later
          // if (planUsage.labels !== -1 && companyUsage.labels >= planUsage.labels) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your tags limit has reached. Please upgrade your plan to premium in order to create more tags.`
          //   })
          // }
          callApi.callApi('pages/query', 'post', {companyId: req.user.companyId, conneected: true}, req.headers.authorization)
            .then(pages => {
              pages.forEach((page, i) => {
                facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.pageAccessToken}`)
                  .then(label => {
                    if (label.error) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Failed to create tag on Facebook ${JSON.stringify(label.error)}`
                      })
                    }
                    let tagPayload = {
                      tag: req.body.tag,
                      userId: req.user._id,
                      companyId: req.user.companyId,
                      pageId: page._id,
                      labelFbId: label.id
                    }
                    callApi.callApi('tags/', 'post', tagPayload, req.headers.authorization)
                      .then(newTag => {
                        callApi.callApi('featureUsage/updateCompany', 'put', {query: {companyId: req.user.companyId}, newPayload: { $inc: { labels: 1 } }, options: {}}, req.headers.authorization)
                          .then(updated => {
                            logger.serverLog(TAG, `Updated Feature Usage ${JSON.stringify(updated)}`)
                          })
                          .catch(err => {
                            if (err) {
                              logger.serverLog(TAG, `ERROR in updating Feature Usage${JSON.stringify(err)}`)
                            }
                          })
                        require('./../../../config/socketio').sendMessageToClient({
                          room_id: req.user.companyId,
                          body: {
                            action: 'new_tag',
                            payload: {
                              tag_id: newTag._id,
                              tag_name: newTag.tag
                            }
                          }
                        })
                        if (i === pages.length - 1) {
                          return res.status(201).json({status: 'success', payload: newTag})
                        }
                      })
                      .catch(err => {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Internal Server Error in saving tag${JSON.stringify(err)}`
                        })
                      })
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Internal Server Error in saving tag${JSON.stringify(err)}`
                    })
                  })
              })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Failed to fetch connected pages ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error in fetching company usage ${JSON.stringify(err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error in fetching plan usage{JSON.stringify(err)}`
        })
      }
    })
}

exports.rename = function (req, res) {
  callApi.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.tag}, req.headers.authorization)
    .then(tags => {
      if (tags.length > 0) {
        tags.forEach((tag, i) => {
          callApi.callApi('pages/query', 'post', {_id: tag.pageId})
            .then(page => {
              facebookApiCaller('v2.11', `me/custom_labels?access_token=${page.pageAccessToken}`)
                .then(label => {
                  if (label.error) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Failed to create tag on Facebook ${JSON.stringify(label.error)}`
                    })
                  }
                  let data = {
                    tag: req.body.newTag,
                    labelFbId: label.id
                  }
                  async.parallelLimit([
                    function (callback) {
                      updateTag(data)
                    }
                    // re-assign
                  ], 10, function (err, results) {
                    if (err) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Failed to create tag on Facebook ${JSON.stringify(label.error)}`
                      })
                    }
                    if (i === tags.length - 1) {
                      return res.status(200).json({status: 'success', payload: 'Tag updated successfully!'})
                    }
                  })
                })
                .catch(err => {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Failed to fetch page ${err}`
                  })
                })
            })
        })
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'Tag not found'
        })
      }
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

function updateTag (tag, data, req, callback) {
  callApi.callApi('tags/update', 'put', {query: {_id: tag._id}, newPayload: data, options: {}}, req.headers.authorization)
    .then(newTag => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'tag_rename',
          payload: {
            tag_id: tag._id,
            tag_name: tag.tag
          }
        }
      })
      callback(null, newTag)
    })
    .catch(err => {
      callback(err)
    })
}

exports.delete = function (req, res) {
  callApi.callApi(`tags_subscriber/query`, 'post', {tagId: req.body.tagId}, req.headers.authorization)
    .then(tagsSubscriber => {
      for (let i = 0; i < tagsSubscriber.length; i++) {
        callApi.callApi(`tags_subscriber/${tagsSubscriber[i]._id}`, 'delete', {}, req.headers.authorization)
          .then(result => {
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to delete tag subscriber ${JSON.stringify(err)}`)
          })
      }
      callApi.callApi(`tags/${req.body.tagId}`, 'delete', {}, req.headers.authorization)
        .then(tagPayload => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: tagPayload.companyId,
            body: {
              action: 'tag_remove',
              payload: {
                tag_id: req.body.tagId
              }
            }
          })
          return res.status(200)
            .json({status: 'success', description: 'Tag removed successfully'})
        })
        .catch(err => {
          return res.status(404).json({
            status: 'failed',
            description: `Failed to remove tag ${err}`
          })
        })
    })
    .catch(err => {
      return res.status(404).json({
        status: 'failed',
        description: `Failed to find tagSubscriber ${err}`
      })
    })
}

exports.assign = function (req, res) {
  callApi.callApi(`tags/${req.body.tagId}`, 'get', {}, req.headers.authorization)
    .then(tagPayload => {
      if (!tagPayload) {
        return res.status(404).json({
          status: 'failed',
          description: 'No tag is available on server with given tagId.'
        })
      }
      req.body.subscribers.forEach((subscriberId) => {
        callApi.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization)
          .then(subscriber => {
            let subscriberTagsPayload = {
              tagId: tagPayload._id,
              subscriberId: subscriber._id,
              companyId: tagPayload.companyId._id
            }
            callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload, req.headers.authorization)
              .then(newRecord => {
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: tagPayload.companyId._id,
                  body: {
                    action: 'tag_assign',
                    payload: {
                      tag_id: req.body.tagId,
                      subscriber_ids: req.body.subscribers
                    }
                  }
                })
                return res.status(201).json({
                  status: 'success',
                  description: 'Tag assigned successfully'
                })
              })
              .catch(err => {
                return res.status(500).json({
                  status: 'failed',
                  description: `Internal Server Error in Finding Subscriber ${JSON.stringify(err)}`
                })
              })
          })
          .catch(err => {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error in Assigning Tags ${JSON.stringify(err)}`
            })
          })
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in Finding Tag ${JSON.stringify(err)}`
      })
    })
}

exports.unassign = function (req, res) {
  callApi.callApi(`tags/${req.body.tagId}`, 'get', {}, req.headers.authorization)
    .then(tagPayload => {
      callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: req.body.tagId, subscriberId: {$in: req.body.subscribers}}, req.headers.authorization)
        .then(result => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: tagPayload.companyId._id,
            body: {
              action: 'tag_unassign',
              payload: {
                tag_id: req.body.tagId,
                subscriber_ids: req.body.subscribers
              }
            }
          })
          return res.status(201).json({
            status: 'success',
            description: 'Tags unassigned successfully'
          })
        })
        .catch(err => {
          return res.status(500)({
            status: 'failed',
            description: `Internal server error in unassigning tags. ${err}`
          })
        })
    })
    .catch(err => {
      return res.status(500)({
        status: 'failed',
        description: `Internal server error in fetching tags. ${err}`
      })
    })
}

exports.subscribertags = function (req, res) {
  callApi.callApi(`tags_subscriber/query`, 'post', {subscriberId: req.body.subscriberId}, req.headers.authorization)
    .then(tagsSubscriber => {
      let payload = []
      for (let i = 0; i < tagsSubscriber.length; i++) {
        payload.push({
          _id: tagsSubscriber[i].tagId._id,
          tag: tagsSubscriber[i].tagId.tag,
          subscriberId: tagsSubscriber[i].subscriberId
        })
      }
      res.status(200).json({
        status: 'success',
        payload: payload
      })
    })
    .catch(err => {
      return res.status(500)({
        status: 'failed',
        description: `Internal server error in fetching tag subscribers. ${err}`
      })
    })
}
