exports.facebook = (body, fname, lname) => {
  let payload = {}
  let text = body.text
  if (body.componentType === 'polls') {
    payload = {
      text: text,
      quick_replies: body.quick_replies,
      metadata: body.metadata
    }
  } else if (body.componentType === 'survey') {
    payload = {
      attachment: body.attachment
    }
  } else if (body.componentType === 'userInput') {
    payload = {
      'text': text,
      'metadata': 'This is a meta data'
    }
    return payload
  } else if (body.componentType === 'text' && !body.buttons) {
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
      'text': text
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
    return JSON.stringify(payload)
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
          'buttons': _updateButtonUrl(body.buttons)
        }
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
  } else if (['image', 'audio', 'file', 'video'].indexOf(
    body.componentType) > -1) {
    payload = {
      'attachment': {
        'type': body.componentType,
        'payload': {
          'attachment_id': body.fileurl.attachment_id
        }
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
    return JSON.stringify(payload)
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
      }
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
                'buttons': _updateButtonUrl(body.buttons),
                'default_action': body.default_action
              }
            ]
          }
        }
      }
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
                'buttons': _updateButtonUrl(body.buttons)
              }
            ]
          }
        }
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
  } else if (body.componentType === 'gallery') {
    var galleryCards = []
    if (body.cards && body.cards.length > 0) {
      for (var g = 0; g < body.cards.length; g++) {
        var card = body.cards[g]
        var galleryCard = {}
        galleryCard.image_url = card.image_url
        galleryCard.title = card.title
        galleryCard.buttons = _updateButtonUrl(card.buttons)
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
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
  } else if (body.componentType === 'media') {
    payload = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'media',
          'elements': [
            {
              'attachment_id': body.fileurl.attachment_id,
              'media_type': body.mediaType,
              'buttons': _updateButtonUrl(body.buttons)
            }
          ]
        }
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.quick_replies = body.quickReplies
    }
  }
  return JSON.stringify(payload)
}

const _updateButtonUrl = (data) => {
  let buttons = [].concat(data)
  let urlBtnIndex = buttons.findIndex((b) => b.type === 'web_url')
  if (urlBtnIndex > -1 && buttons[urlBtnIndex].newUrl) {
    buttons[urlBtnIndex].url = buttons[urlBtnIndex].newUrl
    delete buttons[urlBtnIndex].newUrl
  }
  return buttons
}
