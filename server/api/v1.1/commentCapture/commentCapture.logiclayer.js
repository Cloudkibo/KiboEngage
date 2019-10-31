/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/

exports.setMessage = function (payload) {
  let messageData = {}
  payload.map(payloadItem => {
    if (payloadItem.componentType === 'text') {
      messageData.message = payloadItem.text
    } else if (payloadItem.componentType === 'image') {
      messageData.image = true
      messageData.url = payloadItem.url
    } else if (payloadItem.componentType === 'video') {
      messageData.description = messageData.message
      messageData.video = true
      messageData.file_url = payloadItem.url
    }
  })
  return messageData
}
exports.getPostId = function (data, videoId) {
  return new Promise(function (resolve, reject) {
    let postId = ''
    for (let i = 0; i < data.length; i++) {
      if (data.type === 'video' && data.object_id === videoId) {
        postId = data.id
        break
      }
    }
    resolve(postId)
  })
}
exports.preparePayloadToPost = function (payload) {
  let textComponents = payload.filter(item => item.componentType === 'text')
  let imageComponents = payload.filter(item => item.componentType === 'image')
  let videoComponents = payload.filter(item => item.componentType === 'video')
  if (imageComponents.length > 0) {
    payload = handleImage(imageComponents, textComponents)
    return payload
  } else if (videoComponents.length > 0) {
    payload = handleVideo(videoComponents, textComponents)
    return payload
  } else {
    payload = handleText(textComponents)
    return payload
  }
}
function handleImage (imageComponents, textComponents) {
  let payload = {}
  if (imageComponents.length === 1) {
    payload = {
      type: 'image',
      payload: {
        'url': imageComponents[0].url
        // 'caption': `${text}\n\nTweet link: https://twitter.com/${screenName}/status/${tweetId}`
      }
    }
    if (textComponents.length > 0) {
      payload.payload.caption = textComponents[0].text
    }
  } else if (imageComponents.length > 1) {
    let links = []
    for (let i = 0; i < imageComponents.length && i < 10; i++) {
      links.push({'link': imageComponents[i].url})
    }
    payload = {
      type: 'images',
      payload: {
        // 'message': `${text}\n\nTweet link: https://twitter.com/${screenName}/status/${tweetId}`,
        'link': `https://kibopush.com`,
        'child_attachments': links
      }
    }
    if (textComponents.length > 0) {
      payload.payload.message = textComponents[0].text
    }
  }
  return payload
}

function handleText (textComponents) {
  let payload = {
    type: 'text',
    payload: {
      'message': textComponents[0].text
    }
  }
  let urls = getMetaUrls(textComponents[0])
  if (urls && urls.length > 0) {
    if (urls && urls.length === 1) {
      payload.payload['link'] = urls[0]
    } else if (urls && urls.length > 1) {
      payload.payload['link'] = `https://kibopush.com`
      let links = []
      for (let i = 0; i < urls.length && i < 10; i++) {
        links.push({'link': urls[i]})
      }
      payload.payload['child_attachments'] = links
    }
  }
  return payload
}

function getMetaUrls (text) {
  /* eslint-disable */
  var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  /* eslint-enable */
  var testUrl = text.text.match(urlRegex)
  return testUrl
}

function handleVideo (videoComponents, textComponents) {
  let payload = {
    type: 'video',
    payload: {
      'file_url': videoComponents[0].url
    }
  }
  if (textComponents.length > 0) {
    payload.payload.description = textComponents[0].text
  }
  return payload
}
