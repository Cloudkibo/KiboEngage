exports.prepareDataForSurvey = (questions, subscriber, message, currentUser, survey) => {
  let firstQuestion = questions[0]
  // create buttons
  const buttons = []
  let nextQuestionId = 'nil'
  if (questions.length > 1) {
    nextQuestionId = questions[1]._id
  }

  for (let x = 0; x < firstQuestion.options.length; x++) {
    buttons.push({
      type: 'postback',
      title: firstQuestion.options[x],
      payload: JSON.stringify({
        survey_id: message.automatedMessageId,
        option: firstQuestion.options[x],
        question_id: firstQuestion._id,
        nextQuestionId,
        userToken: currentUser.facebookInfo.fbToken
      })
    })
  }

  const messageData = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: `${survey.description}\nPlease respond to these questions. \n${firstQuestion.statement}`,
        buttons
      }
    }
  }

  const data = {
    messaging_type: 'UPDATE',
    recipient: { id: subscriber.senderId }, // this is the subscriber id
    message: messageData
  }
  return data
}

exports.prepareDataForPoll = (poll, subscriber) => {
  const messageData = {
    text: poll.statement,
    quick_replies: [
      {
        'content_type': 'text',
        'title': poll.options[0],
        'payload': JSON.stringify(
          { poll_id: poll._id, option: poll.options[0] })
      },
      {
        'content_type': 'text',
        'title': poll.options[1],
        'payload': JSON.stringify(
          { poll_id: poll._id, option: poll.options[1] })
      },
      {
        'content_type': 'text',
        'title': poll.options[2],
        'payload': JSON.stringify(
          { poll_id: poll._id, option: poll.options[2] })
      }
    ]
  }
  const data = {
    messaging_type: 'UPDATE',
    recipient: { id: subscriber.senderId }, // this is the subscriber id
    message: messageData
  }
  return data
}

exports.prepareDataForBroadcast = (broadcast, subscriber) => {
  const messages = []

  for (let i = 0; i < broadcast.payload.length; i++) {
    const messageData = {
      'messaging_type': 'UPDATE',
      'recipient': JSON.stringify({
        'id': subscriber.senderId
      })
    }
    let payload = broadcast.payload[i]
    if (payload.componentType === 'text') {
      if (payload.buttons) {
        messageData.message = {
          'attachment': {
            'type': 'image',
            'payload': {
              'template_type': 'button',
              'text': payload.text,
              'buttons': payload.buttons
            }
          }
        }
      } else {
        messageData.message = {
          'text': payload.text
        }
      }
    } else if (payload.componentType === 'image') {
      messageData.message = {
        'attachment': {
          'type': 'image',
          'payload': {
            'url': payload.fileurl.url,
            'is_reusable': true
          }
        }
      }
    } else if (payload.componentType === 'audio') {
      messageData.message = {
        'attachment': {
          'type': 'audio',
          'payload': {
            'url': payload.fileurl.url,
            'is_reusable': true
          }
        }
      }
    } else if (payload.componentType === 'video') {
      messageData.message = {
        'attachment': {
          'type': 'video',
          'payload': {
            'url': payload.fileurl.url,
            'is_reusable': true
          }
        }
      }
    } else if (payload.componentType === 'file') {
      messageData.message = {
        'attachment': {
          'type': 'file',
          'payload': {
            'url': payload.fileurl.url,
            'is_reusable': true
          }
        }
      }
    } else if (payload.componentType === 'card') {
      messageData.message = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [
              {
                'title': payload.title,
                'image_url': payload.fileurl.url,
                'subtitle': payload.description,
                'buttons': payload.buttons
              }
            ]
          }
        }
      }
    } else if (payload.componentType === 'media') {
      if (payload.facebookUrl) {
        messageData.message = {
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'media',
              'elements': [
                {
                  media_type: payload.media_type,
                  url: payload.facebookUrl
                }
              ]
            }
          }
        }
      } else {
        messageData.message = {
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'media',
              'elements': [
                {
                  media_type: payload.media_type,
                  attachment_id: payload.fileurl.attachment_id
                }
              ]
            }
          }
        }
      }
    }
    messages.push(messageData)
  }
  return messages
}

exports.prepareDataForWordpress = (config, subscriber, newURL) => {
  const messageData = {
    'messaging_type': 'UPDATE',
    'recipient': JSON.stringify({
      'id': subscriber.senderId
    }),
    'message': JSON.stringify({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [
            {
              'title': 'Wordpress blog Post title',
              'image_url': config.domain + '/img/wordpress.png',
              'subtitle': 'sent using kibopush.com',
              'buttons': [
                {
                  'type': 'web_url',
                  'url': newURL,
                  'title': 'View Wordpress Blog Post'
                }
              ]
            }
          ]
        }
      }
    })
  }
  return messageData
}
exports.prepareDataForTwitter = (tweet, subscriber) => {
  const messageData = {
    'messaging_type': 'UPDATE',
    'recipient': JSON.stringify({
      'id': subscriber.senderId
    }),
    'message': JSON.stringify({
      'text': tweet.text,
      'metadata': 'This is a meta data for tweet'
    })
  }
  return messageData
}
exports.prepareMessageDataForTwitter = (tweet, subscriber, newURL) => {
  const messageData = {
    'messaging_type': 'UPDATE',
    'recipient': JSON.stringify({
      'id': subscriber.senderId
    }),
    'message': JSON.stringify({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [
            {
              'title': tweet.text,
              'image_url': tweet.entities.media[0].media_url,
              'subtitle': 'sent using kibopush.com',
              'buttons': [
                {
                  'type': 'web_url',
                  'url': newURL,
                  'title': 'View Tweet'
                }
              ]
            }
          ]
        }
      }
    })
  }
  return messageData
}

exports.prepareDataForFacebook = (post, subscriber, newURL) => {
  const messageData = {
    'messaging_type': 'UPDATE',
    'recipient': JSON.stringify({
      'id': subscriber.senderId
    })
  }
  if (post.type === 'status') {
    messageData.message = JSON.stringify({
      'text': post.message,
      'metadata': 'This is metadata'
    })
  } else if (post.type === 'share') {
    messageData.message = JSON.stringify({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [
            {
              'title': post.message
                ? post.message
                : post.from.name,
              'image_url': post.picture,
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
    })
  } else if (post.type === 'photo') {
    messageData.message = JSON.stringify({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [
            {
              'title': post.message
                ? post.message
                : post.from.name,
              'image_url': post.picture,
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
    })
  } else if (post.type === 'video') {
    messageData.message = JSON.stringify({
      'attachment': {
        'type': 'video',
        'payload': {
          'url': post.link,
          'is_reusable': false
        }
      }
    })
  }
  return messageData
}

exports.getValue = (sequenceMessage, subscriber, tags, page, seqSub) => {
  let tempFlag = 0
  let tempSegment = sequenceMessage.segmentation
  // Attaching true whenever a condition is satisfied
  tempSegment.forEach((elem) => {
    if (elem.condition === 'first_name') {
      if (elem.criteria === 'is') {
        if (elem.value === subscriber.firstName) elem.flag = true
      } else if (elem.criteria === 'contains') {
        if (subscriber.firstName.includes(elem.value)) elem.flag = true
      } else if (elem.criteria === 'begins_with') {
        if (subscriber.firstName.startsWith(elem.value)) elem.flag = true
      }
    } else if (elem.condition === 'last_name') {
      if (elem.criteria === 'is') {
        if (elem.value === subscriber.lastName) elem.flag = true
      } else if (elem.criteria === 'contains') {
        if (subscriber.lastName.includes(elem.value)) elem.flag = true
      } else if (elem.criteria === 'begins_with') {
        if (subscriber.startsWith(elem.value)) elem.flag = true
      }
    } else if (elem.condition === 'page') {
      // Converting to string because sent id can either be string or ObjectID. better to convert
      if (page._id.toString() === elem.value.toString()) elem.flag = true
    } else if (elem.condition === 'gender') {
      if (subscriber.gender === elem.value) elem.flag = true
    } else if (elem.condition === 'locale') {
      if (subscriber.locale === elem.value) elem.flag = true
    } else if (elem.condition === 'tag') {
      // Search all tags of company if the condition tag is found
      tags.forEach((tag) => {
        if (tag._id.toString() === elem.value.toString()) elem.flag = true
      })
    } else if (elem.condition === 'subscription_date') {
    // Checking if the date of subscription is matched with the condition
      if (elem.criteria === 'on') {
        if (seqSub.datetime.getDate() === elem.value.getDate()) elem.flag = true
      } else if (elem.criteria === 'before') {
        if (seqSub.datetime.getDate() < elem.value.getDate()) elem.flag = true
      } else if (elem.criteria === 'after') {
        if (seqSub.datetime.getDate() > elem.value.getDate()) elem.flag = true
      }
    }
  })

  // Logic to check if all the conditions matched or some of them matched
  for (let i = 0, length = tempSegment.length; i < length; i++) {
    if (tempSegment[i].flag === true) {
      tempFlag++
    }
  }
  return {
    tempFlag,
    tempSegment
  }
}
