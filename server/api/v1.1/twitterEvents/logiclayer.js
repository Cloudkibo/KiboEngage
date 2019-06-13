const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')
const needle = require('needle')
let request = require('request')
const og = require('open-graph')
var remote = require('remote-file-size')
const fs = require('fs')
const http = require('http')

exports.handleTwitterPayload = function (req, savedMsg, page) {
  return new Promise((resolve, reject) => {
    let tagline = ''
    if (req.quote) {
      let originalUser = req.retweet.user
      let twitterUrls = req.urls.map((url) => url.url)
      let separators = [' ', '\n']
      let textArray = req.quote.split(new RegExp('[' + separators.join('') + ']', 'g'))
      // let textArray = req.quote.split(' ')
      tagline = `@${req.tweetUser.screen_name} retweeted @${originalUser.screen_name}:${prepareText(twitterUrls, textArray, req.urls)}\n\n@${originalUser.screen_name}'s tweet:`
      if (req.retweet.truncated) {
        handleTweet(
          tagline,
          req.retweet.extended_tweet.full_text,
          req.retweet.extended_tweet.extended_entities,
          req.retweet.extended_tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page).then(result => {
          resolve(result)
        })
      } else {
        handleTweet(
          tagline,
          req.retweet.text,
          req.retweet.extended_entities,
          req.retweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page).then(result => {
          resolve(result)
        })
      }
    } else if (req.retweet) {
      let originalUser = req.retweet.user
      tagline = `@${req.tweetUser.screen_name} retweeted @${originalUser.screen_name}:`
      if (req.retweet.truncated) {
        handleTweet(
          tagline,
          req.retweet.extended_tweet.full_text,
          req.retweet.extended_tweet.extended_entities,
          req.retweet.extended_tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page).then(result => {
          resolve(result)
        })
      } else {
        handleTweet(
          tagline,
          req.retweet.text,
          req.retweet.extended_entities,
          req.retweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page).then(result => {
          resolve(result)
        })
      }
    } else if (req.tweet) {
      tagline = `@${req.tweetUser.screen_name} tweeted:`
      if (req.tweet.truncated) {
        handleTweet(
          tagline,
          req.tweet.extended_tweet.full_text,
          req.tweet.extended_tweet.extended_entities,
          req.tweet.extended_tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page).then(result => {
          resolve(result)
        })
      } else {
        handleTweet(
          tagline,
          req.tweet.text,
          req.tweet.extended_entities,
          req.tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page).then(result => {
          resolve(result)
        })
      }
    }
  })
}

const handleTweet = (tagline, text, tweet, urls, savedMsg, tweetId, userName, page) => {
  return new Promise((resolve, reject) => {
    let button = !(tweet && tweet.media && tweet.media.length > 0)
    let payload = []
    let twitterUrls = urls.map((url) => url.url)
    let separators = [' ', '\n']
    let textArray = text.split(new RegExp('[' + separators.join('') + ']', 'g'))
    // let textArray = text.split(' \n')
    text = `${tagline}${prepareText(twitterUrls, textArray, urls)}`
    payload.push(prepareFacbookPayloadForText('text', {text}, savedMsg, tweetId, button))
    if (tweet && tweet.media && tweet.media.length > 0) {
      if (tweet.media[0].type === 'photo') {
        payload.push(prepareFacbookPayloadForImage(tweet, savedMsg, tweetId, userName))
        resolve(payload)
      } else if (tweet.media[0].type === 'animated_gif' || tweet.media[0].type === 'video') {
        prepareFacbookPayloadForVideo(tweet, savedMsg, tweetId, userName, page).then(result => {
          payload.push(result)
          resolve(payload)
        })
      }
    } else if (urls.length > 0 && button) {
      prepareFacbookPayloadForLink(urls, savedMsg, tweetId, userName).then(linkpayload => {
        console.log('linkpayload', linkpayload)
        payload.push(linkpayload.messageData)
        if (!linkpayload.showButton) { // remove button from text
          payload[0] = {
            'text': payload[0].attachment.payload.text
          }
          resolve(payload)
        } else {
          resolve(payload)
        }
      })
    } else {
      resolve(payload)
    }
  })
}

const prepareFacbookPayloadForVideo = (tweet, savedMsg, tweetId, userName, page) => {
  // return new Promise((resolve, reject) => {
  //   let url = getVideoURL(tweet.media[0].video_info.variants)
  //   uploadOnFaceBook(url, page).then(attachmentId => {
  //     let messageData = {
  //       'attachment': {
  //         'type': 'template',
  //         'payload': {
  //           'template_type': 'media',
  //           'elements': [
  //             {
  //               'attachment_id': attachmentId,
  //               'media_type': 'video',
  //               'buttons': body.buttons
  //             }
  //           ]
  //         }
  //       }
  //     }
  //     resolve(messageData)
  //   })
  // })
  return new Promise((resolve, reject) => {
    getVideoURL(tweet.media[0].video_info.variants).then(url => {
      remote(url, function (err, size) {
        if (err) console.log('err')
        let sizeInMb = (size / 1000) / 1000
        console.log('video size', sizeInMb)
        if (sizeInMb > 25) {
          chopVideo(url)
        }
        let messageData = {
          'attachment': {
            'type': 'video',
            'payload': {
              'url': url
            }
          }
        }
        resolve(messageData)
      })
    })
  })
}

const prepareFacbookPayloadForLink = (urls, savedMsg, tweetId, userName) => {
  return new Promise(function (resolve, reject) {
    prepareGalleryForLink(urls, savedMsg, tweetId).then(gallery => {
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

const prepareGalleryForLink = (urls, savedMsg, tweetId) => {
  return new Promise(function (resolve, reject) {
    let gallery = []
    let buttons = []
    prepareViewTweetButton(savedMsg, tweetId).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, tweetId, null, 'card'))
    })
    for (let i = 0; i < urls.length; i++) {
      og(urls[i].expanded_url, (err, meta) => {
        if (err) {
          console.log('error in fetching metdata')
        }
        if (meta !== {} && meta.image && meta.title) {
          console.log('metadata', meta)
          gallery.push({
            'title': meta.title,
            'subtitle': 'kibopush.com',
            'image_url': meta.image.url,
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

const prepareFacbookPayloadForImage = (tweet, savedMsg, tweetId, userName) => {
  let gallery = prepareGallery(tweet.media, savedMsg, tweetId, userName)
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

function prepareGallery (media, savedMsg, tweetId, userName) {
  let length = media.length <= 10 ? media.length : 10
  let elements = []
  let buttons = []
  prepareViewTweetButton(savedMsg, tweetId).then(button => {
    buttons.push(button)
    buttons.push(prepareShareButton(savedMsg, tweetId, null, 'card'))
  })
  for (let i = 0; i < length; i++) {
    elements.push({
      'title': userName,
      'subtitle': 'kibopush.com',
      'image_url': media[i].media_url,
      'buttons': buttons
    })
  }
  return elements
}

const prepareFacbookPayloadForText = (type, body, savedMsg, tweetId, showButton) => {
  let messageData = {}
  let buttons = []
  if (showButton) {
    prepareViewTweetButton(savedMsg, tweetId).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, tweetId, body))
    })
    messageData = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': body.text,
          'buttons': buttons
        }
      }
    }
  } else {
    messageData = {
      'text': body.text
    }
  }
  return messageData
}

const prepareText = (twitterUrls, textArray, urls) => {
  for (let i = 0; i < textArray.length; i++) {
    let index = twitterUrls.indexOf(textArray[i])
    if (index > -1) {
      textArray[i] = urls[index].expanded_url
    } else if (textArray[i].startsWith('http')) {
      textArray[i] = ''
    }
  }
  let text = textArray.join(' ')
  return text !== '' ? `\n${text}` : text
}

const prepareViewTweetButton = (savedMsg, tweetId) => {
  return new Promise(function (resolve, reject) {
    let URLObject = {
      originalURL: `https://twitter.com/statuses/${tweetId}`,
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
          'title': 'View Tweet'
        }
        resolve(button)
      })
  })
}
const prepareShareButton = (savedMsg, tweetId, body, type) => {
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
              'title': body.text,
              'subtitle': 'kibopush.com',
              'default_action': {
                'type': 'web_url',
                'url': `https://twitter.com/statuses/${tweetId}`
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

function getVideoURL (variants) {
  return new Promise((resolve, reject) => {
    let url = ''
    for (let i = 0; i < variants.length; i++) {
      if (variants[i].content_type === 'video/mp4' && (variants[i].bitrate === 2176000 || variants[i].bitrate === 0)) {
        url = variants[i].url
        resolve(url)
      }
    }
  })
}

function uploadOnFaceBook (url, page) {
  return new Promise((resolve, reject) => {
    needle.get(
      `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
      (err, resp2) => {
        if (err) {
          console.log('error in fetching page access_token', JSON.stringify(err))
        }
        let pageAccessToken = resp2.body.access_token
        // let fileReaderStream = fs.createReadStream(payload.fileurl)
        const messageData = {
          'message': JSON.stringify({
            'attachment': {
              'type': 'video',
              'payload': {
                'is_reusable': true,
                'url': url
              }
            }
          })
        }
        request(
          {
            'method': 'POST',
            'json': true,
            'formData': messageData,
            'uri': 'https://graph.facebook.com/v2.6/me/message_attachments?access_token=' + pageAccessToken
          },
          function (err, resp) {
            console.log('response from uploading attachment', JSON.stringify(resp.body))
            if (err) {
              console.log('error in uploading attachment on facebook', JSON.stringify(err))
              reject(err)
            } else if (resp.statusCode !== 200) {
              reject(resp)
            } else {
              resolve(resp.body.attachment_id)
            }
          })
      })
  })
}
function chopVideo (url) {
  const request = http.get('http://i3.ytimg.com/vi/J---aiyznGQ/mqdefault.jpg', function (response) {
    let file = fs.createWriteStream('largeFile.mp4')
    // let stream = response.pipe(file)
    // stream.on('error', (error) => {
    //   if (error) {
    //     stream.end()
    //   }
    // })
    // stream.on('write', function (chunk) {
    //   console.log('file.byteswritten in stream', file.bytesWritten)
    // })
    response.pipe(file).on('data', function (data) {
      console.log('file.byteswritten in stream', file.bytesWritten)
    })
    // stream.on('finish', () => {
    //   console.log('file.byteswritten after finish', file.bytesWritten)
    //   console.log('finished writing')
    // })
  })
}
