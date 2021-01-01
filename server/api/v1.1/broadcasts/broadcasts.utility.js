/**
 * Created by sojharo on 19/09/2017.
 */
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const logger = require('../../../components/logger')
const TAG = 'api/broadcast/broadcasts.utility.js'
const utility = require('../../../components/utility')
const callApi = require('../utility')
const SurveyResponsesDataLayer = require('./../surveys/surveyresponse.datalayer')
const PollResponsesDataLayer = require('./../polls/pollresponse.datalayer')
const request = require('request')
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const needle = require('needle')
let { sendOpAlert } = require('./../../global/operationalAlert')
const {defaultFieldcolumn} = require('../hubspotIntegration/hubspotDefaultFields')
function validateInput (body) {
  if (!_.has(body, 'platform')) return false
  if (!_.has(body, 'payload')) return false
  if (!_.has(body, 'title')) return false

  if (body.payload.length === 0) {
    return false
  } else {
    for (let i = 0; i < body.payload.length; i++) {
      if (body.payload[i].componentType === undefined) return false
      if (body.payload[i].componentType === 'text') {
        if (body.payload[i].text === undefined ||
          body.payload[i].text === '') return false
        if (body.payload[i].buttons) {
          for (let j = 0; j < body.payload[i].buttons.length; j++) {
            if (body.payload[i].buttons[j].type === 'web_url') {
              if (!utility.validateUrl(
                body.payload[i].buttons[j].url)) return false
            }
          }
        }
      }
      if (body.payload[i].componentType === 'card') {
        if (body.payload[i].title === undefined ||
          body.payload[i].title === '') return false
        if (body.payload[i].fileurl === undefined ||
          body.payload[i].fileurl === '') return false
        if (body.payload[i].image_url === undefined ||
          body.payload[i].image_url === '') return false
        if (body.payload[i].description === undefined ||
          body.payload[i].description === '') return false
        if (body.payload[i].buttons === undefined) return false
        if (body.payload[i].buttons.length === 0) return false
        if (!utility.validateUrl(body.payload[i].image_url)) return false
        for (let j = 0; j < body.payload[i].buttons.length; j++) {
          if (body.payload[i].buttons[j].type === 'web_url') {
            if (!utility.validateUrl(
              body.payload[i].buttons[j].url)) return false
          }
        }
      }
      if (body.payload[i].componentType === 'media') {
        if (body.payload[i].fileurl === undefined ||
          body.payload[i].fileurl === '') return false
        if (body.payload[i].mediaType === undefined ||
          body.payload[i].mediaType === '') return false
        for (let j = 0; j < body.payload[i].buttons.length; j++) {
          if (body.payload[i].buttons[j].type === 'web_url') {
            if (!utility.validateUrl(
              body.payload[i].buttons[j].url)) return false
          }
        }
      }
      if (body.payload[i].componentType === 'gallery') {
        if (body.payload[i].cards === undefined) return false
        if (body.payload[i].cards.length === 0) return false
        for (let j = 0; j < body.payload[i].cards.length; j++) {
          if (body.payload[i].cards[j].title === undefined ||
            body.payload[i].cards[j].title === '') return false
          if (body.payload[i].cards[j].image_url === undefined ||
            body.payload[i].cards[j].image_url === '') return false
          if (body.payload[i].cards[j].subtitle === undefined ||
            body.payload[i].cards[j].subtitle === '') return false
          if (body.payload[i].cards[j].buttons === undefined) return false
          if (body.payload[i].cards[j].buttons.length === 0) return false
          if (!utility.validateUrl(
            body.payload[i].cards[j].image_url)) return false
          for (let k = 0; k < body.payload[i].cards[j].buttons.length; k++) {
            if (body.payload[i].cards[j].buttons[k].type === 'web_url') {
              if (!utility.validateUrl(
                body.payload[i].cards[j].buttons[k].url)) return false
            }
          }
        }
      }
    }
  }

  return true
}

function prepareSendAPIPayload (subscriberId, body, fname, lname, isResponse) {
  let messageType = isResponse ? 'RESPONSE' : 'UPDATE'
  let payload = {}
  let text = body.text
  if (body.componentType === 'text' && !body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        /{{user_full_name}}/g, fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        /{{user_first_name}}/g, fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        /{{user_last_name}}/g, lname)
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'text': text,
        'metadata': 'This is a meta data'
      })
    }
    return payload
  } else if (body.componentType === 'text' && body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        /{{user_full_name}}/g, fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        /{{user_first_name}}/g, fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        /{{user_last_name}}/g, lname)
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'button',
            'text': text,
            'buttons': body.buttons
          }
        },
        'metadata': 'This is a meta data'
      })
    }
  } else if (['image', 'audio', 'file', 'video'].indexOf(
    body.componentType) > -1) {
    let dir = path.resolve(__dirname, '../../../broadcastFiles/userfiles')
    let fileReaderStream
    if (body.componentType === 'file') {
      fileReaderStream = fs.createReadStream(dir + '/' + body.fileurl.name)
    } else {
      fileReaderStream = fs.createReadStream(dir + '/' + body.fileurl.id)
    }

    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': body.componentType,
          'payload': {}
        },
        'metadata': 'This is a meta data'
      }),
      'filedata': fileReaderStream
    }
    return payload
    // todo test this one. we are not removing as we need to keep it for live chat
    // if (!isForLiveChat) deleteFile(body.fileurl)
  } else if (['gif', 'sticker', 'thumbsUp'].indexOf(
    body.componentType) > -1) {
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'image',
          'payload': {
            'url': body.fileurl
          }
        },
        'metadata': 'This is a meta data'
      })
    }
  } else if (body.componentType === 'card') {
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [
              {
                'title': body.title,
                'image_url': body.image_url,
                'subtitle': body.description,
                'buttons': body.buttons
              }
            ]
          }
        },
        'metadata': 'This is a meta data'
      })
    }
  } else if (body.componentType === 'gallery') {
    var galleryCards = []
    if (body.cards && body.cards.length > 0) {
      for (var g = 0; g < body.cards.length; g++) {
        var card = body.cards[g]
        var galleryCard = {}
        galleryCard.image_url = card.image_url
        galleryCard.title = card.title
        galleryCard.buttons = card.buttons
        galleryCard.subtitle = card.subtitle
        if (card.default_action) {
          galleryCard.default_action = card.default_action
        }
        galleryCards.push(galleryCard)
      }
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': galleryCards
          }
        },
        'metadata': 'This is a meta data'
      })
    }
  }
  return payload
}

function prepareBroadCastPayload (req, companyId) {
  let broadcastPayload = {
    platform: req.body.platform,
    payload: req.body.payload,
    userId: req.user._id,
    companyId,
    title: req.body.title,
    sent: req.body.subscribersCount,
    messageType: req.body.messageType ? req.body.messageType : 'non promotional'
  }
  if (req.body.isSegmented) {
    broadcastPayload.isSegmented = true
    broadcastPayload.segmentationPageIds = (req.body.segmentationPageIds)
      ? req.body.segmentationPageIds
      : null
    broadcastPayload.segmentationGender = (req.body.segmentationGender)
      ? req.body.segmentationGender
      : null
    broadcastPayload.segmentationLocale = (req.body.segmentationLocale)
      ? req.body.segmentationLocale
      : null
    broadcastPayload.segmentationTags = (req.body.segmentationTags)
      ? req.body.segmentationTags
      : null
  }
  if (req.body.isList) {
    broadcastPayload.isList = true
    broadcastPayload.segmentationList = (req.body.segmentationList)
      ? req.body.segmentationList
      : null
  }
  return broadcastPayload
}

function parseUrl (text) {
  // eslint-disable-next-line no-useless-escape
  let urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  let onlyUrl = ''
  if (text) {
    let testUrl = text.match(urlRegex)
    onlyUrl = testUrl && testUrl[0]
  }
  return onlyUrl
}

function applyTagFilterIfNecessary (req, subscribers, fn, res) {
  if (req.body.segmentationTags && req.body.segmentationTags.length > 0) {
    callApi.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: req.body.segmentationTags } })
      .then(tags => {
        let tagIDs = []
        for (let i = 0; i < tags.length; i++) {
          tagIDs.push(tags[i]._id)
        }
        callApi.callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIDs } })
          .then(tagSubscribers => {
            if (tagSubscribers.length === 0) {
              return res.status(500).json({status: 'failed', description: `No subscribers match the selected criteria`})
            }
            let subscribersPayload = []
            for (let i = 0; i < subscribers.length; i++) {
              for (let j = 0; j < tagSubscribers.length; j++) {
                if (subscribers[i]._id.toString() ===
                  tagSubscribers[j].subscriberId._id.toString()) {
                  subscribersPayload.push({
                    _id: subscribers[i]._id,
                    firstName: subscribers[i].firstName,
                    lastName: subscribers[i].lastName,
                    locale: subscribers[i].locale,
                    gender: subscribers[i].gender,
                    timezone: subscribers[i].timezone,
                    profilePic: subscribers[i].profilePic,
                    companyId: subscribers[i].companyId,
                    pageScopedId: '',
                    email: '',
                    senderId: subscribers[i].senderId,
                    pageId: subscribers[i].pageId,
                    datetime: subscribers[i].datetime,
                    isEnabledByPage: subscribers[i].isEnabledByPage,
                    isSubscribed: subscribers[i].isSubscribed,
                    unSubscribedBy: subscribers[i].unSubscribedBy,
                    source: subscribers[i].source
                  })
                }
              }
            }
            fn(subscribersPayload)
          })
          .catch(err => {
            const message = err || 'Failed to fetch tag subscribers'
            logger.serverLog(message, `${TAG}: applyTagFilterIfNecessary`, req.body, {user: req.user}, 'error')
          })
      })
      .catch(err => {
        const message = err || 'Failed to fetch tag'
        logger.serverLog(message, `${TAG}: applyTagFilterIfNecessary`, req.body, {user: req.user}, 'error')
      })
  } else {
    fn(subscribers)
  }
}

function applySurveyFilterIfNecessary (req, subscribers, fn) {
  if (req.body.segmentationSurvey && req.body.segmentationSurvey.length > 0) {
    SurveyResponsesDataLayer.genericFind({ surveyId: { $in: req.body.segmentationSurvey } })
      .then(responses => {
        let subscribersPayload = []
        for (let i = 0; i < subscribers.length; i++) {
          for (let j = 0; j < responses.length; j++) {
            if (subscribers[i]._id.toString() ===
              responses[j].subscriberId.toString()) {
              subscribersPayload.push({
                _id: subscribers[i]._id,
                firstName: subscribers[i].firstName,
                lastName: subscribers[i].lastName,
                locale: subscribers[i].locale,
                gender: subscribers[i].gender,
                timezone: subscribers[i].timezone,
                profilePic: subscribers[i].profilePic,
                companyId: subscribers[i].companyId,
                pageScopedId: '',
                email: '',
                senderId: subscribers[i].senderId,
                pageId: subscribers[i].pageId,
                datetime: subscribers[i].datetime,
                isEnabledByPage: subscribers[i].isEnabledByPage,
                isSubscribed: subscribers[i].isSubscribed,
                unSubscribedBy: subscribers[i].unSubscribedBy,
                source: subscribers[i].source
              })
            }
          }
        }
        fn(subscribersPayload)
      })
      .catch(err => {
        const message = err || 'Failed to fetch survey responses'
        logger.serverLog(message, `${TAG}: applySurveyFilterIfNecessary`, req.body, {user: req.user}, 'error')
      })
  } else {
    fn(subscribers)
  }
}
function applyPollFilterIfNecessary (req, subscribers, fn) {
  if (req.body.segmentationPoll && req.body.segmentationPoll.length > 0) {
    PollResponsesDataLayer.genericFindForPollResponse({ pollId: { $in: req.body.segmentationPoll } })
      .then(responses => {
        let subscribersPayload = []
        for (let i = 0; i < subscribers.length; i++) {
          for (let j = 0; j < responses.length; j++) {
            if (subscribers[i]._id.toString() ===
              responses[j].subscriberId._id.toString()) {
              subscribersPayload.push({
                _id: subscribers[i]._id,
                firstName: subscribers[i].firstName,
                lastName: subscribers[i].lastName,
                locale: subscribers[i].locale,
                gender: subscribers[i].gender,
                timezone: subscribers[i].timezone,
                profilePic: subscribers[i].profilePic,
                companyId: subscribers[i].companyId,
                pageScopedId: '',
                email: '',
                senderId: subscribers[i].senderId,
                pageId: subscribers[i].pageId,
                datetime: subscribers[i].datetime,
                isEnabledByPage: subscribers[i].isEnabledByPage,
                isSubscribed: subscribers[i].isSubscribed,
                unSubscribedBy: subscribers[i].unSubscribedBy,
                source: subscribers[i].source
              })
            }
          }
        }
        fn(subscribersPayload)
      })
      .catch(err => {
        const message = err || 'Failed to fetch poll responses'
        logger.serverLog(message, `${TAG}: applyPollFilterIfNecessary`, req.body, {user: req.user}, 'error')
      })
  } else {
    fn(subscribers)
  }
}

function prepareMessageData (subscriberId, body, fname, lname) {
  let payload = {}
  let text = body.text
  if (body.componentType === 'userInput') {
    payload = {
      'text': text,
      'metadata': 'This is a meta data'
    }
    return payload
  }
  if (body.componentType === 'text' && !body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        /{{user_full_name}}/g, fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        /{{user_first_name}}/g, fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        /{{user_last_name}}/g, lname)
    }
    payload = {
      'text': text,
      'metadata': 'This is a meta data'
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
    return payload
  } else if (body.componentType === 'text' && body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        '{{user_full_name}}', fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        '{{user_first_name}}', fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        '{{user_last_name}}', lname)
    }
    payload = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': text,
          'buttons': removeOldUrlFromButton(body.buttons)
        }
      },
      'metadata': 'This is a meta data'
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
    return payload
  } else if (['image', 'audio', 'file', 'video'].indexOf(
    body.componentType) > -1) {
    if (body.fileurl && body.fileurl.attachment_id) {
      payload = {
        'attachment': {
          'type': body.file ? body.file.componentType : body.componentType, 
          'payload': {
            'attachment_id': body.fileurl.attachment_id
          }
        },
        'metadata': 'This is a meta data'
      }
    } else {
      payload = {
        'attachment': {
          'type': body.componentType,
          'payload': {
            'url': body.fileurl.url
          }
        },
        'metadata': 'This is a meta data'
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
    return payload
    // todo test this one. we are not removing as we need to keep it for live chat
    // if (!isForLiveChat) deleteFile(body.fileurl)
  } else if (['gif', 'sticker', 'thumbsUp'].indexOf(
    body.componentType) > -1) {
    payload = {
      'attachment': {
        'type': 'image',
        'payload': {
          'url': body.fileurl
        }
      },
      'metadata': 'This is a meta data'
    }
  } else if (body.componentType === 'card') {
    if (body.default_action) {
      payload = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [
              {
                'title': body.title,
                'image_url': body.image_url,
                'subtitle': body.description,
                'buttons': removeOldUrlFromButton(body.buttons),
                'default_action': body.default_action
              }
            ]
          }
        },
        'metadata': 'This is a meta data'
      }
      if (body.quickReplies && body.quickReplies.length > 0) {
        payload.quick_replies = body.quickReplies
      }
      return payload
    } else {
      payload = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [
              {
                'title': body.title,
                'image_url': body.image_url,
                'subtitle': body.description,
                'buttons': removeOldUrlFromButton(body.buttons)
              }
            ]
          }
        },
        'metadata': 'This is a meta data'
      }
      if (body.quickReplies && body.quickReplies.length > 0) {
        payload.quick_replies = body.quickReplies
      }
      return payload
    }
  } else if (body.componentType === 'gallery') {
    var galleryCards = []
    if (body.cards && body.cards.length > 0) {
      for (var g = 0; g < body.cards.length; g++) {
        var card = body.cards[g]
        var galleryCard = {}
        galleryCard.image_url = card.image_url
        galleryCard.title = card.title
        galleryCard.buttons = removeOldUrlFromButton(card.buttons)
        galleryCard.subtitle = card.subtitle
        if (card.default_action) {
          galleryCard.default_action = card.default_action
        }
        galleryCards.push(galleryCard)
      }
    }
    payload = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': galleryCards
        }
      },
      'metadata': 'This is a meta data'
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
    return payload
  } else if (body.componentType === 'media') {
    if (body.facebookUrl) {
      payload = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'media',
            'elements': [
              {
                'url': body.facebookUrl,
                'media_type': body.mediaType,
                'buttons': body.buttons
              }
            ]
          }
        },
        'metadata': 'This is a meta data'
      }
    } else {
      payload = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'media',
            'elements': [
              {
                'attachment_id': body.fileurl.attachment_id,
                'media_type': body.mediaType,
                'buttons': body.buttons
              }
            ]
          }
        },
        'metadata': 'This is a meta data'
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
    return payload
  }
}

/* eslint-disable */
function getBatchData (payload, recipientId, page, sendBroadcast, fname, lname, res, subscriberNumber, subscribersLength, fbMessageTag, testBroadcast) {
  let recipient = "recipient=" + encodeURIComponent(JSON.stringify({"id": recipientId}))
  let tag = "tag=" + encodeURIComponent(fbMessageTag)
  let messagingType = "messaging_type=" + encodeURIComponent("MESSAGE_TAG")
  let batch = []
  payload.forEach((item, index) => {
    // let message = "message=" + encodeURIComponent(JSON.stringify(prepareSendAPIPayload(recipientId, item).message))
    let message = "message=" + encodeURIComponent(JSON.stringify(prepareMessageData(recipientId, item, fname, lname)))
    // let message = "message=" + JSON.stringify(prepareMessageData(recipientId, item, fname, lname))
    if (index === 0) {
      batch.push({ "method": "POST", "name": `message${index + 1}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag})

    } else {
      batch.push({ "method": "POST", "name": `message${index + 1}`, "depends_on": `message${index}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag})
    }
    if (index === (payload.length - 1)) {
      sendBroadcast(JSON.stringify(batch), page, res, subscriberNumber, subscribersLength, testBroadcast)
    }
  })
}
/* eslint-enable */

function uploadOnFacebook (payloadItem, pageAccessToken) {
  let dir = path.resolve(__dirname, '../../../broadcastFiles/')
  let fileReaderStream = fs.createReadStream(dir + '/userfiles/' + payloadItem.fileurl.name)
  let type = payloadItem.componentType === 'media' ? payloadItem.mediaType : payloadItem.componentType
  const messageData = {
    'message': JSON.stringify({
      'attachment': {
        'type': type,
        'payload': {
          'is_reusable': true
        }
      }
    }),
    'filedata': fileReaderStream
  }
  request(
    {
      'method': 'POST',
      'json': true,
      'formData': messageData,
      'uri': 'https://graph.facebook.com/v6.0/me/message_attachments?access_token=' + pageAccessToken
    },
    function (err, resp) {
      if (err) {
        const message = err || 'Unable to upload attachment on Facebook'
        logger.serverLog(message, `${TAG}: uploadOnFacebook`, messageData, {}, 'error')
        return ({status: 'failed', data: err})
      } else {
        if (resp.body.error) {
          sendOpAlert(resp.body.error, 'broadcast utility in kiboengage', '', '', '')
        }
        payloadItem.fileurl.attachment_id = resp.body.attachment_id
        return ({status: 'success', data: payloadItem})
      }
    })
}
function remove_hubspot_data (payload) {
  var HubspotMappingColumns = defaultFieldcolumn.HubspotMappingColumns
  if (payload.mapping !== '' && payload.hubspotAction !== 'submit_form') {
    if (payload.hubspotAction === 'get_contact') {
      payload.mapping = payload.mapping.filter(map => map.customFieldColumn)
    }
    console.log('payload after removing data', payload)
    for (let i = 0; i < payload.mapping.length; i++) {
      payload.mapping[i].hubspotColumn = HubspotMappingColumns[payload.mapping[i].hubspotColumn]
    }
  }
  console.log('payload after mapping', payload)
  return payload
}
function addModuleIdIfNecessary (payload, broadcastId) {
  for (let i = 0; i < payload.length; i++) {
    var data = null
    if (payload[i].quickReplies && payload[i].quickReplies.length > 0) {
      for (let k = 0; k < payload[i].quickReplies.length; k++) {
        if (payload[i].quickReplies[k].payload) {
          data = JSON.parse(payload[i].quickReplies[k].payload)
        }
        if (data) {
          for (let j = 0; j < data.length; j++) {
            if (data[j] && data[j].action === 'hubspot') {
              data[j] = remove_hubspot_data(data[j])
            }
          }
        }
        if (payload[i].quickReplies[k].payload) {
          payload[i].quickReplies[k].payload = JSON.stringify(data)
        }
      }
    }
    data = null
    if (payload[i].buttons && payload[i].buttons.length > 0) {
      payload[i].buttons.forEach((button) => {
        if (button.payload) {
          data = JSON.parse(button.payload)
        }
        if (data) {
          for (let i = 0; i < data.length; i++) {
            if (data[i] && data[i].action === 'hubspot') {
              data[i] = remove_hubspot_data(data[i])
            }
          }
        }
        if (button.payload) {
          button.payload = JSON.stringify(data)
        }
        if (button.url && !button.messenger_extensions) {
          let temp = button.url.split('/')
          let urlId = temp[temp.length - 1]
          URLDataLayer.findOneURL(urlId)
            .then(URLObject => {
              let module = URLObject.module
              module.id = broadcastId
              URLObject.module = module
              URLDataLayer.updateOneURL(URLObject._id, {'module': module})
                .then(savedurl => {
                })
                .catch(err => {
                  const message = err || 'Failed to update url'
                  logger.serverLog(message, `${TAG}: addModuleIdIfNecessary`, payload, {}, 'error')
                })
            })
            .catch(err => {
              const message = err || 'Failed to fetch URL object'
              logger.serverLog(message, `${TAG}: addModuleIdIfNecessary`, payload, {}, 'error')
            })
        }
      })
    } else if (payload[i].componentType === 'gallery') {
      payload[i].cards.forEach((card) => {
        card.buttons.forEach((button) => {
          if (button.url) {
            let temp = button.url.split('/')
            let urlId = temp[temp.length - 1]
            URLDataLayer.findOneURL(urlId)
              .then(URLObject => {
                URLObject.module.id = broadcastId
                URLObject.updateOneURL(URLObject._id, {'module.id': broadcastId})
                  .then(savedurl => {
                  })
                  .catch(err => {
                    const message = err || 'Failed to update url'
                    logger.serverLog(message, `${TAG}: addModuleIdIfNecessary`, payload, {}, 'error')
                  })
              })
              .catch(err => {
                const message = err || 'Failed to fetch URL object'
                logger.serverLog(message, `${TAG}: addModuleIdIfNecessary`, payload, {}, 'error')
              })
          }
        })
      })
    }
  }
}
function isWhiteListedDomain (domain, pageId, user) {
  return new Promise(function (resolve, reject) {
    let returnValue = false
    needle.get(`https://graph.facebook.com/v6.0/${pageId}?fields=access_token&access_token=${user.facebookInfo.fbToken}`,
      (err, resp) => {
        if (err) {
        }
        if (resp.body.error) {
          sendOpAlert(resp.body.error, 'broadcast utility in kiboengage', pageId, user._id, '')
        }
        needle.get(`https://graph.facebook.com/v6.0/me/messenger_profile?fields=whitelisted_domains&access_token=${resp.body.access_token}`,
          (err, resp) => {
            if (err) {
            }
            if (resp.body.error) {
              sendOpAlert(resp.body.error, 'broadcast utility in kiboengage', pageId, user._id, '')
            }
            console.log('reponse from whitelisted_domains', resp.body.data)
            if (resp.body.data && resp.body.data[0].whitelisted_domains) {
              for (let i = 0; i < resp.body.data[0].whitelisted_domains.length; i++) {
                if (domain.includes(getHostName(resp.body.data[0].whitelisted_domains[i]))) {
                  returnValue = true
                }
                if (i === resp.body.data[0].whitelisted_domains.length - 1) {
                  resolve({returnValue: returnValue})
                }
              }
            } else {
              resolve({returnValue: returnValue})
            }
          })
      })
  })
}
function isWebView (body) {
  if ((body.messenger_extensions && !(_.has(body, 'webview_height_ratio'))) ||
    (body.webview_height_ratio && !(_.has(body, 'messenger_extensions'))) ||
  ((body.webview_height_ratio || body.messenger_extensions) && !(_.has(body, 'pageId')))) {
    return false
  } else {
    return true
  }
}
function getHostName (url) {
  var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i)
  if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
    return match[2]
  } else {
    return null
  }
}
function removeOldUrlFromButton (buttons) {
  if (buttons.length > 0) {
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].id) {
        delete buttons[i].id
      }
      if (buttons[i].type === 'web_url' && buttons[i].newUrl) {
        buttons[i].url = buttons[i].newUrl
        delete buttons[i].newUrl
        if (i === buttons.length - 1) {
          return buttons
        }
      } else {
        if (i === buttons.length - 1) {
          return buttons
        }
      }
    }
  } else {
    return buttons
  }
}

function getSubscriberInfoFromFB (sender, page) {
  return new Promise((resolve, reject) => {
    const options = {
      url: `https://graph.facebook.com/v6.0/${sender}?fields=gender,first_name,last_name&access_token=${page.accessToken}`,
      qs: { access_token: page.accessToken },
      method: 'GET'
    }
    needle.get(options.url, options, (error, response) => {
      if (error) {
        reject(error)
      } else {
        resolve(response)
      }
    })
  })
}
exports.getSubscriberInfoFromFB = getSubscriberInfoFromFB
exports.prepareSendAPIPayload = prepareSendAPIPayload
exports.prepareBroadCastPayload = prepareBroadCastPayload
exports.parseUrl = parseUrl
exports.validateInput = validateInput
exports.applyTagFilterIfNecessary = applyTagFilterIfNecessary
exports.applySurveyFilterIfNecessary = applySurveyFilterIfNecessary
exports.applyPollFilterIfNecessary = applyPollFilterIfNecessary
exports.getBatchData = getBatchData
exports.prepareMessageData = prepareMessageData
exports.uploadOnFacebook = uploadOnFacebook
exports.addModuleIdIfNecessary = addModuleIdIfNecessary
exports.isWhiteListedDomain = isWhiteListedDomain
exports.isWebView = isWebView
exports.remove_hubspot_data = remove_hubspot_data
