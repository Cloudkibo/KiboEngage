let _ = require('lodash')

exports.pagesFindCriteria = function (postingItem) {
  let pagesFindCriteria = {
    companyId: postingItem.companyId,
    connected: true
  }

  if (postingItem.isSegmented) {
    if (postingItem.segmentationPageIds && postingItem.segmentationPageIds.length > 0) {
      pagesFindCriteria = _.merge(pagesFindCriteria, {
        pageId: {
          $in: postingItem.segmentationPageIds
        }
      })
    }
  }
  return pagesFindCriteria
}
exports.subscriberFindCriteria = function (postingItem, page) {
  let subscriberFindCriteria = {
    pageId: page._id,
    isSubscribed: true,
    isEnabledByPage: true,
    companyId: page.companyId
  }

  if (postingItem.isSegmented) {
    if (postingItem.segmentationGender.length > 0) {
      subscriberFindCriteria = _.merge(
        subscriberFindCriteria,
        {
          gender: {
            $in: postingItem.segmentationGender
          }
        })
    }
    if (postingItem.segmentationLocale.length > 0) {
      subscriberFindCriteria = _.merge(
        subscriberFindCriteria, {
          locale: {
            $in: postingItem.segmentationLocale
          }
        })
    }
  }
  return subscriberFindCriteria
}
exports.prepareMessageDataForStatus = function (event, newURL) {
  let messageData = {
    'text': event.value.message
  }
  return messageData
}
exports.prepareMessageDataForShare = function (event, newURL) {
  let messageData = {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'generic',
        'elements': [
          {
            'title': (event.value.message)
              ? event.value.message
              : event.value.sender_name,
            'image_url': event.value.image,
            'subtitle': 'kibopush.com',
            'buttons': [
              {
                'type': 'web_url',
                'url': newURL,
                'title': 'View Link'
              }
            ]
          }
        ]
      }
    }
  }
  return [messageData]
}
exports.prepareMessageDataForImage = function (event, newURL) {
  let messageData = {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'generic',
        'elements': [
          {
            'title': (event.value.message)
              ? event.value.message
              : event.value.sender_name,
            'image_url': event.value.link,
            'subtitle': 'kibopush.com',
            'buttons': [
              {
                'type': 'web_url',
                'url': newURL,
                'title': 'View Page'
              }
            ]
          }
        ]
      }
    }
  }
  return messageData
}
exports.prepareMessageDataForVideo = function (event) {
  let messageData = {
    'attachment': {
      'type': 'video',
      'payload': {
        'url': event.value.link,
        'is_reusable': false
      }
    }
  }
  return messageData
}
exports.prepareAutomationQueuePayload = function (savedMsg, subscriber) {
  let timeNow = new Date()
  return {
    automatedMessageId: savedMsg._id,
    subscriberId: subscriber._id,
    companyId: savedMsg.companyId,
    type: 'autoposting-fb',
    scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
  }
}
