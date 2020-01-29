/**
 * Created by sojharo on 27/07/2017.
 */
const callApi = require('../utility')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let queryData = {companyId: companyUser.companyId}
      callApi.callApi('tags/query', 'post', queryData)
        .then(tags => {
          console.log('tags', tags)
          async.each(tags, (singleTag, callback) => {
            callApi.callApi('tags_subscriber/query', 'post', {tagId: singleTag._id})
              .then(tagsSubscribers => {
                console.log('tagsSubscribers', tagsSubscribers)
                for (let i = 0; i < tags.length; i++) {
                  if (tags[i]._id === singleTag._id) {
                    tags[i].status = tagsSubscribers.length > 0 ? 'Assigned' : 'Unassigned'
                    tags[i].subscribersCount = tagsSubscribers.length
                  }
                }
                callback()
              })
              .catch(err => callback(err))
          }, (err) => {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in fetching tags${JSON.stringify(err)}`
              })
            }
            console.log('tags final', tags)
            res.status(200).json({status: 'success', payload: tags})
          })
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
  callApi.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: {$regex: req.body.tag, $options: 'i'}})
    .then(tags => {
      if (tags.length > 0) {
        sendErrorResponse(res, 500, '', `Tag with similar name already exists`)
      } else {
        let tagPayload = {
          tag: req.body.tag,
          userId: req.user._id,
          companyId: req.user.companyId
        }
        callApi.callApi('tags/', 'post', tagPayload)
          .then(newTag => {
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
            sendSuccessResponse(res, 200, newTag)
          })
          .catch(err => {
            sendErrorResponse(res, 500, '', `Internal Server Error in saving tag${JSON.stringify(err)}`)
          })
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to fetch tags ${JSON.stringify(err)}`)
    })
}

exports.rename = function (req, res) {
  callApi.callApi(`tags/query`, 'post', {companyId: req.user.companyId, tag: req.body.tag})
    .then(tag => {
      tag = tag[0]
      if (tag) {
        callApi.callApi('tags/update', 'put', {query: {companyId: req.user.companyId, tag: req.body.tag}, newPayload: {tag: req.body.newTag}, options: {}})
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
            sendSuccessResponse(res, 200, 'Tag has been deleted successfully!')
          })
          .catch(err => {
            sendErrorResponse(res, 404, '', `Failed to edit tag ${err}`)
          })
      } else {
        sendErrorResponse(res, 404, '', 'Tag not found')
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

exports.delete = function (req, res) {
  callApi.callApi('tags/query', 'post', {companyId: req.user.companyId, tag: req.body.tag})
    .then(tag => {
      tag = tag[0]
      if (tag) {
        async.parallelLimit([
          function (callback) {
            callApi.callApi(`tags/deleteMany`, 'post', {tag: req.body.tag, companyId: req.user.companyId})
              .then(tagPayload => {
                callback(null)
              })
              .catch(err => {
                callback(err)
              })
          },
          function (callback) {
            callApi.callApi(`tags_subscriber/query`, 'post', {tagId: tag._id})
              .then(tagsSubscriber => {
                if (tagsSubscriber.length > 0) {
                  for (let i = 0; i < tagsSubscriber.length; i++) {
                    callApi.callApi(`tags_subscriber/${tagsSubscriber[i]._id}`, 'delete', {})
                      .then(result => {
                      })
                      .catch(err => {
                        callback(err)
                      })
                    if (i === tagsSubscriber.length - 1) {
                      callback(null)
                    }
                  }
                } else {
                  callback(null)
                }
              })
              .catch(err => {
                callback(err)
              })
          }
        ], 10, function (err, results) {
          if (err) {
            sendErrorResponse(res, 500, '', `Failed to delete tag ${err}`)
          } else {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'tag_remove',
                payload: {
                  tag_id: tag._id
                }
              }
            })
            sendSuccessResponse(res, 200, 'Tag has been deleted successfully!')
          }
        })
      } else {
        sendErrorResponse(res, 404, '', 'Tag not found')
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to find tags ${err}`)
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

function assignTagToSubscribers (subscribers, tag, req, callback, flag) {
  let tags = []
  subscribers.forEach((subscriberId, i) => {
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {})
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          let tagPayload = tags[existsTag.index]
          let subscriberTagsPayload = {
            tagId: tagPayload._id,
            subscriberId: subscriber._id,
            companyId: req.user.companyId
          }
          if (flag) {
            callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
              .then(newRecord => {
                if (i === subscribers.length - 1) {
                  callback(null, 'success')
                }
              })
              .catch(err => callback(err))
          }
        } else {
          callApi.callApi('tags/query', 'post', {tag, companyId: req.user.companyId})
            .then(tagPayload => {
              tagPayload = tagPayload[0]
              tags.push(tagPayload)
              let subscriberTagsPayload = {
                tagId: tagPayload._id,
                subscriberId: subscriber._id,
                companyId: req.user.companyId
              }
              if (flag) {
                callApi.callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
                  .then(newRecord => {
                    if (i === subscribers.length - 1) {
                      callback(null, 'success')
                    }
                  })
                  .catch(err => callback(err))
              }
            })
            .catch(err => callback(err))
        }
      })
      .catch(err => callback(err))
  })
}

exports.assign = function (req, res) {
  let subscribers = req.body.subscribers
  let tag = req.body.tag
  async.parallelLimit([
    function (callback) {
      assignTagToSubscribers(subscribers, tag, req, callback, true)
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Internal Server Error in Assigning tag ${JSON.stringify(err)}`)
    }
    require('./../../../config/socketio').sendMessageToClient({
      room_id: req.user.companyId,
      body: {
        action: 'tag_assign',
        payload: {
          tag: req.body.tag,
          subscriber_ids: req.body.subscribers
        }
      }
    })
    sendSuccessResponse(res, 200, '', 'Tag assigned successfully')
  })
}

function unassignTagFromSubscribers (subscribers, tag, req, callback) {
  let tags = []
  subscribers.forEach((subscriberId, i) => {
    callApi.callApi(`subscribers/${subscriberId}`, 'get', {})
      .then(subscriber => {
        let existsTag = isTagExists(subscriber.pageId._id, tags)
        if (existsTag.status) {
          let tagPayload = tags[existsTag.index]
          callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: tagPayload._id, subscriberId: subscriber._id})
            .then(deleteRecord => {
              if (i === subscribers.length - 1) {
                callback(null, 'success')
              }
            })
            .catch(err => callback(err))
        } else {
          callApi.callApi('tags/query', 'post', {tag, companyId: req.user.companyId})
            .then(tagPayload => {
              tagPayload = tagPayload[0]
              tags.push(tagPayload)
              callApi.callApi(`tags_subscriber/deleteMany`, 'post', {tagId: tagPayload._id, subscriberId: subscriber._id})
                .then(deleteRecord => {
                  if (i === subscribers.length - 1) {
                    callback(null, 'success')
                  }
                })
                .catch(err => callback(err))
            })
            .catch(err => callback(err))
        }
      })
      .catch(err => {
        callback(err)
      })
  })
}

exports.unassign = function (req, res) {
  let subscribers = req.body.subscribers
  let tag = req.body.tag
  async.parallelLimit([
    function (callback) {
      unassignTagFromSubscribers(subscribers, tag, req, callback)
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Internal Server Error in unassigning tag ${err}`)
    }
    require('./../../../config/socketio').sendMessageToClient({
      room_id: req.user.companyId,
      body: {
        action: 'tag_unassign',
        payload: {
          tag_id: req.body.tag,
          subscriber_ids: req.body.subscribers
        }
      }
    })
    sendSuccessResponse(res, 200, '', 'Tags unassigned successfully')
  })
}

exports.subscribertags = function (req, res) {
  callApi.callApi(`tags_subscriber/query`, 'post', {subscriberId: req.body.subscriberId})
    .then(tagsSubscriber => {
      let payload = []
      for (let i = 0; i < tagsSubscriber.length; i++) {
        payload.push({
          _id: tagsSubscriber[i].tagId._id,
          tag: tagsSubscriber[i].tagId.tag,
          subscriberId: tagsSubscriber[i].subscriberId
        })
      }
      sendSuccessResponse(res, 200, payload)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal server error in fetching tag subscribers. ${err}`)
    })
}
