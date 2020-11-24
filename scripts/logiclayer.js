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
    },
    'metadata': 'This is a meta data for tweet'
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
    'metadata': 'This is a meta data for tweet',
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
          },
          'metadata': 'This is a meta data for tweet'
        }
      } else {
        messageData.message = {
          'text': payload.text,
          'metadata': 'This is a meta data for tweet'
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
        },
        'metadata': 'This is a meta data for tweet'
      }
    } else if (payload.componentType === 'audio') {
      messageData.message = {
        'attachment': {
          'type': 'audio',
          'payload': {
            'url': payload.fileurl.url,
            'is_reusable': true
          }
        },
        'metadata': 'This is a meta data for tweet'
      }
    } else if (payload.componentType === 'video') {
      messageData.message = {
        'attachment': {
          'type': 'video',
          'payload': {
            'url': payload.fileurl.url,
            'is_reusable': true
          }
        },
        'metadata': 'This is a meta data for tweet'
      }
    } else if (payload.componentType === 'file') {
      messageData.message = {
        'attachment': {
          'type': 'file',
          'payload': {
            'url': payload.fileurl.url,
            'is_reusable': true
          }
        },
        'metadata': 'This is a meta data for tweet'
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
        },
        'metadata': 'This is a meta data for tweet'
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
            },
            'metadata': 'This is a meta data for tweet'
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
          },
          'metadata': 'This is a meta data for tweet'
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
      },
      'metadata': 'This is a meta data for tweet'
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
      },
      'metadata': 'This is a meta data for tweet'
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
      },
      'metadata': 'This is a meta data for tweet'
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
      },
      'metadata': 'This is a meta data for tweet'
    })
  } else if (post.type === 'video') {
    messageData.message = JSON.stringify({
      'attachment': {
        'type': 'video',
        'payload': {
          'url': post.link,
          'is_reusable': false
        }
      },
      'metadata': 'This is a meta data for tweet'
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
exports.getEmailBody = (rssFeedUrl, userName) => {
  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
      <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"/>
          <meta http-equiv="X-UA-Compatible" content="IE=Edge"/>
          <!--[if (gte mso 9)|(IE)]>
          <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
          <![endif]--><!--[if (gte mso 9)|(IE)]>
          <style type="text/css"> body{width: 600px;margin: 0 auto;}table{border-collapse: collapse;}table, td{mso-table-lspace: 0pt;mso-table-rspace: 0pt;}img{-ms-interpolation-mode: bicubic;}</style>
          <![endif]-->
          <style type="text/css"> body, p, div{font-family: arial; font-size: 14px;}body{color: #000000;}body a{color: #1188E6; text-decoration: none;}p{margin: 0; padding: 0;}table.wrapper{width:100% !important; table-layout: fixed; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}img.max-width{max-width: 100% !important;}.column.of-2{width: 50%;}.column.of-3{width: 33.333%;}.column.of-4{width: 25%;}@media screen and (max-width:480px){.preheader .rightColumnContent, .footer .rightColumnContent{text-align: left !important;}.preheader .rightColumnContent div, .preheader .rightColumnContent span, .footer .rightColumnContent div, .footer .rightColumnContent span{text-align: left !important;}.preheader .rightColumnContent, .preheader .leftColumnContent{font-size: 80% !important; padding: 5px 0;}table.wrapper-mobile{width: 100% !important; table-layout: fixed;}img.max-width{height: auto !important; max-width: 480px !important;}a.bulletproof-button{display: block !important; width: auto !important; font-size: 80%; padding-left: 0 !important; padding-right: 0 !important;}.columns{width: 100% !important;}.column{display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important;}}</style>
      </head>
      <body>
          <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size: 14px; font-family: arial; color: #000000; background-color: #ebebeb;">
            <div class="webkit">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#ebebeb">
                  <tr>
                      <td valign="top" bgcolor="#ebebeb" width="100%">
                        <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="100%">
                                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td>
                                          <!--[if mso]>
                                          <center>
                                              <table>
                                                <tr>
                                                    <td width="600">
                                                      <![endif]-->
                                                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width:600px;" align="center">
                                                          <tr>
                                                            <td role="modules-container" style="padding: 0px 0px 0px 0px; color: #000000; text-align: left;" bgcolor="#ffffff" width="100%" align="left">
                                                                <table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">
                                                                  <tr>
                                                                      <td role="module-content">
                                                                        <p></p>
                                                                      </td>
                                                                  </tr>
                                                                </table>
                                                                <table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                                                                  <tr>
                                                                      <td style="font-size:6px;line-height:10px;padding:35px 0px 0px 0px;background-color:#ffffff;" valign="top" align="center"> <img class="max-width" border="0" style="display:block;color:#000000;text-decoration:none;font-family:Helvetica, arial, sans-serif;font-size:16px;" width="300" height="75" src="https://kibopush.com/wp-content/uploads/2020/07/kibopush-logo.png" alt="Logo"> </td>
                                                                  </tr>
                                                                </table>
                                                                <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                                                                  <tr>
                                                                      <td style="padding:15px 045px 30px 45px;line-height:22px;text-align:inherit;" height="100%" valign="top" bgcolor="">
                                                                        <div>Hello ${userName},</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>Hope you are doing well!</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>The RSS Feed at this URL ${rssFeedUrl} is no longer available. Therefore, we have disabled your RSS Integration. Please visit https://kiboengage.cloudkibo.com and update the Rss Feed Url in order to keep sending updates to your subscribers.</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>If you have any queries, you can send message to our <a href="https://www.facebook.com/kibopush/" style="background-color: rgb(255, 255, 255); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; font-family: arial; font-size: 14px;">Facebook Page</a>. Our admins will get back to you. Or, you can join our <a href="https://www.facebook.com/groups/kibopush/">Facebook Community</a>.</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>Thanks</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>Regards,</div>
                                                                        <div>KiboPush Team</div>
                                                                        <div>CloudKibo</div>
                                                                      </td>
                                                                  </tr>
                                                                </table>
                                                                <table class="module" role="module" data-type="social" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                                                                  <tbody>
                                                                      <tr>
                                                                        <td valign="top" style="padding:10px 0px 30px 0px;font-size:6px;line-height:10px;background-color:#f5f5f5;">
                                                                            <table align="center">
                                                                              <tbody>
                                                                                  <tr>
                                                                                    <td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://www.facebook.com/kibopush/" target="_blank" alt="Facebook" data-nolink="false" title="Facebook " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#3B579D;"> <img role="social-icon" alt="Facebook" title="Facebook " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/facebook.png"/> </a> </td>
                                                                                    <td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://twitter.com/kibopush" target="_blank" alt="Twitter" data-nolink="false" title="Twitter " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#7AC4F7;"> <img role="social-icon" alt="Twitter" title="Twitter " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/twitter.png"/> </a> </td>
                                                                                  </tr>
                                                                              </tbody>
                                                                            </table>
                                                                        </td>
                                                                      </tr>
                                                                  </tbody>
                                                                </table>
                                                            </td>
                                                          </tr>
                                                      </table>
                                                      <!--[if mso]>
                                                    </td>
                                                </tr>
                                              </table>
                                          </center>
                                          <![endif]-->
                                        </td>
                                    </tr>
                                  </table>
                              </td>
                            </tr>
                        </table>
                      </td>
                  </tr>
                </table>
            </div>
          </center>
      </body>
    </html>
  `
}
