/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const TAG = 'api/tags/tags.controller.js'

const TagsDataLayer = require('./tags.datalayer')
const Tags = require('./tags.model')
const TagsSubscribersDataLayer = require('./../tags_subscribers/tags_subscribers.datalayer')
const TagsSubscribers = require('./../tags_subscribers/tags_subscribers.model')

const callApi = require('../../../utility/api.caller.service')

exports.index = function (req, res) {

  callApi.callApi('companyuser/query', post, {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      TagsDataLayer.findTag({companyId: companyUser.companyId})
        .then(tags => {
          res.status(200).json({status: 'success', payload: tags})
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          }
        })
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

exports.create = function (req, res) {
  callApi.callApi('companyprofile/query', 'post', {ownerId: req.user._id})
    .then(companyProfile => {
      callApi.callApi('featureUsage/planQuery', 'post', {planId: companyProfile.planId})
        .then(planUsage => {
          callApi.callApi('featureUsage/companyQuery', 'post', {companyId: companyProfile._id})
            .then(companyUsage => {
              if (planUsage.labels !== -1 && companyUsage.labels >= planUsage.labels) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Your tags limit has reached. Please upgrade your plan to premium in order to create more tags.`
                })
              }
              callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
                .then(companyUser => {

                  if (!companyUser) {
                    return res.status(404).json({
                      status: 'failed',
                      description: 'The user account does not belong to any company. Please contact support'
                    })
                  }
                  let tagPayload = new Tags({
                    tag: req.body.tag,
                    userId: req.user._id,
                    companyId: companyUser.companyId
                  })
                  tagPayload.save((err, newTag) => {
                    if (err) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error ${JSON.stringify(err)}`
                      })
                    }
                    callApi.call('featureUsage/updateCompany', 'post', {companyId: companyUser.companyId, $inc: { labels: 1 }})
                      .then(updated => {
                      })
                      .catch(err => {
                        if (err) {
                          logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                        }
                      })
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'new_tag',
                        payload: {
                          tag_id: newTag._id,
                          tag_name: newTag.tag
                        }
                      }
                    })
                    res.status(201).json({status: 'success', payload: newTag})
                  })
                })
                .catch(err => {
                  if (err) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Internal Server Error ${JSON.stringify(err)}`
                    })
                  }
                })
            })
            .catch(err => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Internal Server Error ${JSON.stringify(err)}`
                })
              }
            })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          }
        })
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

exports.rename = function (req, res) {
  TagsDataLayer.findTag({_id: req.body.tagId})
    .then(tagPayload => {
      if (!tagPayload) {
        return res.status(404).json({
          status: 'failed',
          description: 'No tag is available on server with given tagId.'
        })
      }
      tagPayload.tag = req.body.tagName
      tagPayload.save((err, newTag) => {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        require('./../../../config/socketio').sendMessageToClient({
          room_id: newTag.companyId,
          body: {
            action: 'tag_rename',
            payload: {
              tag_id: newTag._id,
              tag_name: newTag.tag
            }
          }
        })
        res.status(200).json({status: 'success', payload: newTag})
      })
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

exports.delete = function (req, res) {
  TagsDataLayer.findTag({_id: req.body.tagId})
    .then(tagPayload => {
      if (!tagPayload) {
        return res.status(404).json({
          status: 'failed',
          description: 'No tag is available on server with given tagId.'
        })
      }
      TagsSubscribersDataLayer.genericRemove({tagId: req.body.tagId})
        .then(() => {
          TagsDataLayer.removeTag({_id: req.body.tagId})
            .then(() => {
              require('./../../../config/socketio').sendMessageToClient({
                room_id: tagPayload.companyId,
                body: {
                  action: 'tag_remove',
                  payload: {
                    tag_id: req.body.tagId
                  }
                }
              })
              res.status(200)
                .json({status: 'success', description: 'Tag removed successfully'})
            })
            .catch(err => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Internal Server Error ${JSON.stringify(err)}`
                })
              }
            })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          }
        })
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

exports.assign = function (req, res) {
  TagsDataLayer.findTag({_id: req.body.tagId})
    .then(tagPayload => {
      if (!tagPayload) {
        return res.status(404).json({
          status: 'failed',
          description: 'No tag is available on server with given tagId.'
        })
      }
      req.body.subscribers.forEach((subscriberId) => {
        callApi.callApi(`subscribers/${subscriberId}`, subscriber => {
          if (!subscriber) {
            logger.serverLog(TAG,
              `WRONG SUBSCRIBER ID ${subscriberId} SENT IN ${JSON.stringify(
                req.body.payload)}`)
          }
          let subscriberTagsPayload = new TagsSubscribers({
            tagId: tagPayload._id,
            subscriberId: subscriber._id,
            companyId: tagPayload.companyId
          })
          subscriberTagsPayload.save((err) => {
            if (err) {
              logger.serverLog(TAG,
                `Internal Server Error ${JSON.stringify(err)}`)
            }
          })
        })
        .catch(err => {
          if (err) {
            logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`)
          }
        })
      })
      require('./../../../config/socketio').sendMessageToClient({
        room_id: tagPayload.companyId,
        body: {
          action: 'tag_assign',
          payload: {
            tag_id: req.body.tagId,
            subscriber_ids: req.body.subscribers
          }
        }
      })
      res.status(201).json({
        status: 'success',
        description: 'Tag assigned successfully'
      })
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

exports.unassign = function (req, res) {
  TagsDataLayer.findTag({_id: req.body.tagId})
    .then(tagPayload => {
      if (!tagPayload) {
        return res.status(404).json({
          status: 'failed',
          description: 'No tag is available on server with given tagId.'
        })
      }
      TagsSubscribersDataLayer.genericRemove({tagId: req.body.tagId, subscriberId: {$in: req.body.subscribers}})
        .then(() => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: tagPayload.companyId,
            body: {
              action: 'tag_unassign',
              payload: {
                tag_id: req.body.tagId,
                subscriber_ids: req.body.subscribers
              }
            }
          })
          res.status(201).json({
            status: 'success',
            description: 'Tag unassigned successfully'
          })
        })
        .catch(err => {
          if (err) {
            return res.status(400)
            .json({status: 'failed', description: 'Parameters are missing'})
          }
        })
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

exports.subscribertags = function (req, res) {
  TagsSubscribersDataLayer.genericfind({subscriberId: req.body.subscriberId})
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
      if (err) {
        return res.status(400)
          .json({status: 'failed', description: 'Parameters are missing'})
      }
    })
}

exports.query = function (req, res) {
  TagsSubscribersDataLayer.genericfind(req.body)
    .then(tags => {
      res.status(200).json({
        status: 'success',
        payload: tags
      })
    })
    .catch(err => {
      if (err) {
        return res.status(400)
          .json({status: 'failed', description: 'Parameters are missing'})
      }
    })
}
