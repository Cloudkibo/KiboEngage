let _ = require('lodash')
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')
const utility = require('../utility')
var ogs = require('open-graph-scraper')

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
exports.handleFacebookPayload = function (body, savedMsg) {
  return new Promise((resolve, reject) => {
    let tagline = ''
    if (body.item === 'share' && !body.link.includes('http')) {
      let originalPage = body.link.split('/')
      let query = { $or: [ { pageId: originalPage[1] }, { pageUserName: originalPage[1] } ] }
      utility.callApi(`pages/query`, 'post', query)
        .then(pages => {
          tagline = `${body.sender_name} shared ${pages[0].pageName}'s post:`
          handlePost(tagline, body, savedMsg).then(result => {
            resolve(result)
          })
        })
    } else {
      tagline = `${body.sender_name} shared:`
      handlePost(tagline, body, savedMsg).then(result => {
        resolve(result)
      })
    }
  })
}

const handlePost = (tagline, body, savedMsg) => {
  return new Promise((resolve, reject) => {
    let payload = []
    let button = body.item === 'status' && !body.photos
    let text = body.message ? `${tagline}\n\n${body.message}` : tagline
    payload.push(prepareFacbookPayloadForText(text, savedMsg, body.post_id, button))
    if (body.item === 'video') { //  video
      payload.push(prepareFacbookPayloadForVideo(body.link))
      resolve(payload)
    } else if (body.item === 'photo') { //  single image
      payload.push(prepareFacbookPayloadForImage([body.link], savedMsg, body.post_id, body.sender_name))
      resolve(payload)
    } else if (body.item === 'status' && body.photos) { //  multiple images
      payload.push(prepareFacbookPayloadForImage(body.photos, savedMsg, body.post_id, body.sender_name))
      resolve(payload)
    } else if (body.item === 'share') { // link or shared post
      if (body.link.includes('http')) { //  simple link sharing
        getUrls(body.message).then(urls => {
          prepareFacbookPayloadForLink(urls, savedMsg, body.post_id, body.sender_name).then(result => {
            payload.push(result.messageData)
            if (!result.showButton && button) { // remove button from text
              payload[0] = {
                'text': payload[0].attachment.payload.text
              }
              resolve(payload)
            } else {
              resolve(payload)
            }
          })
        })
      } else { //  shared post
        prepareFacbookPayloadForLink([`https://facebook.com${body.link}`], savedMsg, body.post_id, body.sender_name).then(result => {
          payload.push(result.messageData)
          if (!result.showButton && button) { // remove button from text
            payload[0] = {
              'text': payload[0].attachment.payload.text
            }
            resolve(payload)
          } else {
            resolve(payload)
          }
        })
      }
    } else {
      resolve(payload)
    }
  })
}

const getUrls = (text) => {
  return new Promise(function (resolve, reject) {
    let splittedText = text.split('\n')
    let urls = []
    for (let i = 0; i < splittedText.length; i++) {
      if (splittedText[i].startsWith('http')) {
        urls.push(splittedText[i])
        if (i === splittedText.length - 1) {
          resolve(urls)
        }
      }
      if (i === splittedText.length - 1) {
        resolve(urls)
      }
    }
  })
}

const prepareFacbookPayloadForLink = (urls, savedMsg, postId, pageName) => {
  return new Promise(function (resolve, reject) {
    prepareGalleryForLink(urls, savedMsg, postId).then(gallery => {
      let messageData = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': gallery
          }
        }
      }
      resolve({messageData: messageData, showButton: !(gallery.length > 0)})
    })
  })
}

const prepareGalleryForLink = (urls, savedMsg, postId) => {
  return new Promise(function (resolve, reject) {
    let gallery = []
    let buttons = []
    prepareViewPostButton(savedMsg, postId).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, postId, null, 'card'))
    })
    let options
    for (let i = 0; i < urls.length; i++) {
      options = {'url': urls[i]}
      ogs(options, (err, meta) => {
        if (err) {
          console.log('error in fetching metdata')
        }
        if (meta !== {} && meta.data && meta.data.ogTitle && meta.data.ogDescription && meta.data.ogImage) {
          gallery.push({
            'title': meta.data.ogTitle,
            'subtitle': meta.data.ogDescription,
            'image_url': meta.data.ogImage.url,
            'buttons': buttons
          })
          if (i === urls.length - 1) {
            resolve(gallery)
          }
        } else {
          if (i === urls.length - 1) {
            resolve(gallery)
          }
        }
      })
    }
  })
}

const prepareFacbookPayloadForVideo = (media) => {
  console.log('media', media)
  let messageData = {
    'attachment': {
      'type': 'video',
      'payload': {
        'url': media
      }
    }
  }
  return messageData
}

const prepareFacbookPayloadForImage = (images, savedMsg, postId, pageName) => {
  let gallery = prepareGallery(images, savedMsg, postId, pageName)
  let messageData = {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'generic',
        'elements': gallery
      }
    }
  }
  return messageData
}
function prepareGallery (media, savedMsg, postId, pageName) {
  let length = media.length <= 10 ? media.length : 10
  let elements = []
  let buttons = []
  prepareViewPostButton(savedMsg, postId).then(button => {
    buttons.push(button)
    buttons.push(prepareShareButton(savedMsg, postId, null, 'card'))
  })
  for (let i = 0; i < length; i++) {
    elements.push({
      'title': pageName,
      'subtitle': 'kibopush.com',
      'image_url': media[i],
      'buttons': buttons
    })
  }
  return elements
}
const prepareFacbookPayloadForText = (text, savedMsg, postId, showButton) => {
  let messageData = {}
  let buttons = []
  if (showButton) {
    prepareViewPostButton(savedMsg, postId).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, postId, text))
    })
    messageData = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': text,
          'buttons': buttons
        }
      }
    }
  } else {
    messageData = {
      'text': text
    }
  }
  return messageData
}
const prepareViewPostButton = (savedMsg, postId) => {
  return new Promise(function (resolve, reject) {
    let URLObject = {
      originalURL: `https://facebook.com/${postId}`,
      module: {
        id: savedMsg._id,
        type: 'autoposting'
      }
    }
    URLDataLayer.createURLObject(URLObject)
      .then(savedurl => {
        let newURL = config.domain + '/api/URL/' + savedurl._id
        let button = {
          'type': 'web_url',
          'url': newURL,
          'title': 'View Post'
        }
        resolve(button)
      })
  })
}
const prepareShareButton = (savedMsg, postId, text, type) => {
  let button
  if (type && type === 'card') {
    button = {
      'type': 'element_share'
    }
  } else {
    button = {
      'type': 'element_share',
      'share_contents': {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [{
              'title': text,
              'subtitle': 'kibopush.com',
              'default_action': {
                'type': 'web_url',
                'url': `https://facebook.com/${postId}`
              },
              'buttons': []
            }]
          }
        }
      }
    }
  }
  return button
}
