let _ = require('lodash')
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')
const utility = require('../utility')
const {openGraphScrapper} = require('../../global/utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/facebookEvents/autoposting.logiclayer.js'

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
    console.log('body in handleFacebookPayload', body)
    if (body.item === 'share' && body.link && !body.link.includes('http')) {
      let originalPage = body.link.split('=')
      let query = { pageId: originalPage[originalPage.length - 1] }
      utility.callApi(`pages/query`, 'post', query)
        .then(pages => {
          if (pages && pages.length > 0) {
            tagline = `${body.from.name} shared ${pages[0].pageName}'s post:`
          } else {
            tagline = `${body.from.name} shared:`
          }
          handlePost(tagline, body, savedMsg).then(result => {
            resolve(result)
          })
        })
    } else {
      tagline = `${body.from.name} shared:`
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
      payload.push(prepareFacbookPayloadForImage([body.link], savedMsg, body.post_id, body.from.name))
      resolve(payload)
    } else if (body.item === 'status' && body.photos) { //  multiple images
      payload.push(prepareFacbookPayloadForImage(body.photos, savedMsg, body.post_id, body.from.name))
      resolve(payload)
    } else if (body.item === 'share') { // link or shared post
      if (body.link.includes('http')) { //  simple link sharing
        getUrls(body.message).then(urls => {
          prepareFacbookPayloadForLink(urls, savedMsg, body.post_id, body.from.name).then(result => {
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
        prepareFacbookPayloadForLink([`https://facebook.com${body.link}`], savedMsg, body.post_id, body.from.name).then(result => {
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
    })
    let length = urls.length
    for (let i = 0; i < length; i++) {
      openGraphScrapper(urls[i])
        .then(meta => {
          if (meta && meta !== {} && meta.ogTitle && meta.ogDescription && meta.ogImage) {
            gallery.push({
              'title': meta.ogTitle,
              'subtitle': meta.ogDescription,
              'image_url': meta.ogImage.url,
              'buttons': buttons
            })
            if (i === length - 1) {
              resolve(gallery)
            }
          } else {
            if (i === length - 1) {
              resolve(gallery)
            }
          }
        })
        .catch(err => {
          if (err === 'Must scrape an HTML page') {
            resolve(gallery)
          } else {
            const message = err || 'Error from open graph'
            logger.serverLog(message, `${TAG}: prepareGalleryForLink`, {urls, savedMsg, postId}, {}, 'error')
          }
        })
    }
  })
}

const prepareFacbookPayloadForVideo = (media) => {
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
