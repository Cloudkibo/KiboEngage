const logger = require('../server/components/logger')
const config = require('../server/config/environment')
const utility = require('../server/api/v1.1/utility')
const AutomationQueueDataLayer = require('../server/api/v1.1/automationQueue/automationQueue.datalayer')
const SurveyQuestionsDataLayer = require('../server/api/v1.1/surveys/surveyquestion.datalayer')
const SurveysDataLayer = require('../server/api/v1.1/surveys/surveys.datalayer')
const SurveyPageDataLayer = require('../server/api/v1.1/page_survey/page_survey.datalayer')
const PollPageDataLayer = require('../server/api/v1.1/page_poll/page_poll.datalayer')
const PollsDataLayer = require('../server/api/v1.1/polls/polls.datalayer')
const AutoPostingMessagesDataLayer = require('../server/api/v1.1/autopostingMessages/autopostingMessages.datalayer')
const AutopostingSubscriberMessagesDataLayer = require('../server/api/v1.1/autopostingMessages/autopostingSubscriberMessages.datalayer')
const URLDataLayer = require('../server/api/v1.1/URLforClickedCount/URL.datalayer')
const LogicLayer = require('./logiclayer')
const TAG = 'scripts/monodb_script.js'
const BroadcastsDataLayer = require('../server/api/v1.1/broadcasts/broadcasts.datalayer')
const BroadcastPageDataLayer = require('../server/api/v1.1/page_broadcast/page_broadcast.datalayer')
const request = require('request')
let Twit = require('twit')
const needle = require('needle')
const compUtility = require('../server/components/utility')

AutomationQueueDataLayer.findAllAutomationQueueObjects()
  .then(data => {
    if (data) {
      for (let i = 0; i < data.length; i++) {
        let message = data[i]
        if (message.scheduledTime.getTime() < new Date().getTime()) {
          if (message.type === 'survey') {
            /* Getting the company user who has connected the facebook account */
            utility.callApi(`subscribers/${message.subscriberId}`)
              .then(subscriber => {
                utility.callApi(`pages/${subscriber.pageId}`)
                  .then(page => {
                    utility.callApi(`user/${page.userId}`)
                      .then(connectedUser => {
                        var currentUser = connectedUser
                        SurveyQuestionsDataLayer.genericfindForSurveyQuestions({ 'surveyId': message.automatedMessageId })
                          .then(questions => {
                            SurveysDataLayer.findOneSurvey(message.automatedMessageId)
                              .then(survey => {
                                if (questions.length > 0) {
                                  const data = LogicLayer.prepareDataForSurvey(questions, subscriber, message, currentUser, survey)
                                  // checks the age of function using callback
                                  compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                                    if (err) {
                                      logger.serverLog(TAG, 'inside error')
                                      logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                    }
                                    if (isLastMessage) {
                                      logger.serverLog(TAG, 'inside scheduler suvery send')
                                      needle.post(
                                        `https://graph.facebook.com/v2.6/me/messages?access_token=${page.accessToken}`,
                                        data, (err, resp) => {
                                          if (err) {
                                            logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                          }
                                          SurveyPageDataLayer.createForSurveyPage({
                                            pageId: page.pageId,
                                            userId: currentUser._id,
                                            subscriberId: subscriber.senderId,
                                            surveyId: message._id,
                                            seen: false,
                                            companyId: message.companyId
                                          })
                                            .then(saved => {
                                              AutomationQueueDataLayer.deleteAutomationQueueObject(message._id)
                                                .then(result => {
                                                  logger.serverLog(TAG, 'successfully deleted ' + JSON.stringify(result))
                                                })
                                                .catch(err => {
                                                  logger.serverLog(TAG, `Failed to delete automation queue object ${JSON.stringify(err)}`)
                                                })
                                            })
                                            .catch(err => {
                                              logger.serverLog(TAG, `Failed to create survey page ${JSON.stringify(err)}`)
                                            })
                                        })
                                    } else {
                                      logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                                      let timeNow = new Date()
                                      AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                        .then(updated => {
                                        })
                                        .catch(err => {
                                          logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                        })
                                    }
                                  })
                                } else {
                                  logger.serverLog(TAG, 'Survey Questions not found - scheduler')
                                }
                              })
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to fetch survey ${JSON.stringify(err)}`)
                              })
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to fetch survey questions ${JSON.stringify(err)}`)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `Failed to fetch user ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
              })
          } else if (message.type === 'poll') {
          /* Getting the company user who has connected the facebook account */
            AutoPostingMessagesDataLayer.findOneAutopostingMessage(message.automatedMessageId)
              .then(autopostingMessage => {
                utility.callApi(`subscribers/${message.subscriberId}`)
                  .then(subscriber => {
                    utility.callApi(`pages/${subscriber.pageId}`)
                      .then(page => {
                        utility.callApi(`user/${page.userId}`)
                          .then(connectedUser => {
                            PollsDataLayer.findOnePoll(message.automatedMessageId)
                              .then(poll => {
                                let currentUser = connectedUser
                                const data = LogicLayer.prepareDataForPoll(poll, subscriber)
                                // this calls the needle when the last message was older than 30 minutes
                                // checks the age of function using callback
                                compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                                  if (err) {
                                    logger.serverLog(TAG, 'inside error')
                                    logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                  }
                                  if (isLastMessage) {
                                    needle.post(
                                      `https://graph.facebook.com/v2.6/me/messages?access_token=${page.accessToken}`,
                                      data, (err, resp) => {
                                        if (err) {
                                          logger.serverLog(TAG, err)
                                          logger.serverLog(TAG,
                                            `Error occured at subscriber :${JSON.stringify(
                                              subscriber)}`)
                                        }
                                        PollPageDataLayer.createForPollPage({
                                          pageId: page.pageId,
                                          userId: currentUser._id,
                                          companyId: message.companyId,
                                          subscriberId: subscriber.senderId,
                                          pollId: poll._id,
                                          seen: false
                                        })
                                          .then(saved => {
                                            AutomationQueueDataLayer.deleteAutomationQueueObject(message._id)
                                              .then(result => {
                                                logger.serverLog(TAG, 'successfully deleted ' + JSON.stringify(result))
                                              })
                                              .catch(err => {
                                                logger.serverLog(TAG, `Failed to delete automation queue object ${JSON.stringify(err)}`)
                                              })
                                          })
                                          .catch(err => {
                                            logger.serverLog(TAG, `Failed to create page poll ${JSON.stringify(err)}`)
                                          })
                                      })
                                  } else {
                                    logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                                    let timeNow = new Date()
                                    AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                      .then(updated => {
                                      })
                                      .catch(err => {
                                        logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                      })
                                  }
                                })
                              })
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to fetch poll ${JSON.stringify(err)}`)
                              })
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to fetch user ${JSON.stringify(err)}`)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch autoposting message ${JSON.stringify(err)}`)
              })
          } else if (message.type === 'autoposting-wordpress') {
            AutoPostingMessagesDataLayer.findOneAutopostingMessage(message.automatedMessageId)
              .then(autopostingMessage => {
                utility.callApi(`subscribers/${message.subscriberId}`)
                  .then(subscriber => {
                    utility.callApi(`pages/${subscriber.pageId}`)
                      .then(page => {
                        let messageData = {}
                        URLDataLayer.genericFind({ 'originalURL': autopostingMessage.message_id })
                          .then(savedurl => {
                            savedurl = savedurl[0]
                            let newURL = config.domain + '/api/URL/' + savedurl._id
                            messageData = LogicLayer.prepareDataForWordpress(config, subscriber, newURL)
                            // Logic to control the autoposting when last activity is less than 30 minutes
                            compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                              if (err) {
                                logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                              }
                              if (isLastMessage) {
                                logger.serverLog(TAG, 'inside autoposting wordpress send')
                                sendAutopostingMessage(messageData, page, message)
                              } else {
                                // Logic to add into queue will go here
                                logger.serverLog(TAG, 'inside adding to autoposting queue')
                                let timeNow = new Date()
                                AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                  .then(updated => {
                                  })
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                  })
                              }
                            })
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to fetch url object ${JSON.stringify(err)}`)
                          })
                        AutopostingSubscriberMessagesDataLayer.createAutopostingSubscriberMessage({
                          pageId: page.pageId,
                          companyId: message.companyId,
                          autopostingId: autopostingMessage.autopostingId,
                          autoposting_messages_id: autopostingMessage._id,
                          subscriberId: subscriber.senderId
                        })
                          .then(savedSubscriberMsg => {
                            logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to create autoposting subscriber message ${JSON.stringify(err)}`)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch autoposting message ${JSON.stringify(err)}`)
              })
          } else if (message.type === 'autoposting-twitter') {
            let twitterClient = new Twit({
              consumer_key: config.twitter.consumer_key,
              consumer_secret: config.twitter.consumer_secret,
              access_token: config.twitter.consumer_token,
              access_token_secret: config.twitter.consumer_token_secret
            })
            AutoPostingMessagesDataLayer.findOneAutopostingMessage(message.automatedMessageId)
              .then(autopostingMessage => {
                twitterClient.get('statuses/show/:id', { id: autopostingMessage.message_id }, (err, tweet) => {
                  if (err) {
                    logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                  }
                  utility.callApi(`subscribers/${message.subscriberId}`)
                    .then(subscriber => {
                      utility.callApi(`pages/${subscriber.pageId}`)
                        .then(page => {
                          let messageData = {}
                          if (!tweet.entities.media) { // (tweet.entities.urls.length === 0 && !tweet.entities.media) {
                            messageData = LogicLayer.prepareDataForTwitter
                            // Logic to control the autoposting when last activity is less than 30 minutes
                            compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                              if (err) {
                                logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                              }
                              if (isLastMessage) {
                                logger.serverLog(TAG, 'inside autoposting send')
                                sendAutopostingMessage(messageData, page, message)
                              } else {
                                // Logic to add into queue will go here
                                logger.serverLog(TAG, 'inside adding autoposting-twitter to autoposting queue')
                                let timeNow = new Date()
                                AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                  .then(updated => {
                                  })
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                  })
                              }
                            })
                          } else {
                            URLDataLayer.createURLObject({
                              originalURL: tweet.entities.media[0].url,
                              subscriberId: subscriber._id,
                              module: {
                                id: autopostingMessage._id,
                                type: 'autoposting'
                              }
                            })
                              .then(savedurl => {
                                let newURL = config.domain + '/api/URL/' + savedurl._id
                                messageData = LogicLayer.prepareMessageDataForTwitter(tweet, subscriber, newURL)
                                // Logic to control the autoposting when last activity is less than 30 minutes
                                compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                                  if (err) {
                                    logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                  }

                                  if (isLastMessage) {
                                    logger.serverLog(TAG, 'inside autoposting autoposting twitter send')
                                    sendAutopostingMessage(messageData, page, message)
                                  } else {
                                    // Logic to add into queue will go here
                                    logger.serverLog(TAG, 'inside adding to autoposting queue')
                                    let timeNow = new Date()
                                    AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                      .then(updated => {
                                      })
                                      .catch(err => {
                                        logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                      })
                                  }
                                })
                              })
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to create url ovject ${JSON.stringify(err)}`)
                              })
                          }
                          AutopostingSubscriberMessagesDataLayer.createAutopostingSubscriberMessage({
                            pageId: page.pageId,
                            companyId: message.companyId,
                            autopostingId: autopostingMessage.autopostingId,
                            autoposting_messages_id: autopostingMessage._id,
                            subscriberId: subscriber.senderId
                          })
                            .then(savedSubscriberMsg => {
                              logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                            })
                            .catch(err => {
                              logger.serverLog(TAG, `Failed to create autoposting subscriber message ${JSON.stringify(err)}`)
                            })
                        })
                        .catch(err => {
                          logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
                        })
                    })
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to fetch subsriber ${JSON.stringify(err)}`)
                    })
                })
              })
          } else if (message.type === 'autoposting-fb') {
            AutoPostingMessagesDataLayer.findOneAutopostingMessage(message.automatedMessageId)
              .then(autopostingMessage => {
                utility.callApi(`subscribers/${message.subscriberId}`)
                  .then(subscriber => {
                    utility.callApi(`pages/${subscriber.pageId}`)
                      .then(page => {
                        needle.post(
                          `https://graph.facebook.com/v2.6/${message.automatedMessageId}?access_token=${page.accessToken}&fields=id,message,picture,type,attachments,link,from`,
                          data, (err, post) => {
                            if (err) {
                              logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                            }
                            if (post.type !== 'status') {
                              URLDataLayer.createURLObject({
                                originalURL: post.link,
                                subscriberId: subscriber._id,
                                module: {
                                  id: autopostingMessage._id,
                                  type: 'autoposting'
                                }
                              })
                                .then(savedurl => {
                                  let newURL = config.domain + '/api/URL/' + savedurl._id
                                  let messageData = LogicLayer.prepareDataForFacebook(post, subscriber, newURL)
                                  // Logic to control the autoposting when last activity is less than 30 minutes
                                  compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                                    if (err) {
                                      logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                    }

                                    if (isLastMessage) {
                                      logger.serverLog(TAG, 'inside autoposting facebook send')
                                      sendAutopostingMessage(messageData, page, message)
                                    } else {
                                      // Logic to add into queue will go here
                                      logger.serverLog(TAG, 'inside adding to autoposting queue')
                                      let timeNow = new Date()
                                      AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                        .then(updated => {
                                        })
                                        .catch(err => {
                                          logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                        })
                                    }
                                  })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, `Failed to create url ovject ${JSON.stringify(err)}`)
                                })
                            } else {
                              let messageData = LogicLayer.prepareDataForFacebook(post, subscriber)
                              // Logic to control the autoposting when last activity is less than 30 minutes
                              compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                                if (err) {
                                  logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                }
                                if (isLastMessage) {
                                  logger.serverLog(TAG, 'inside autoposting facebook send')
                                  sendAutopostingMessage(messageData, page, message)
                                } else {
                                  // Logic to add into queue will go here
                                  logger.serverLog(TAG, 'inside adding to autoposting queue')
                                  let timeNow = new Date()
                                  AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                    .then(updated => {
                                    })
                                    .catch(err => {
                                      logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                    })
                                }
                              })
                            }
                          })
                        AutopostingSubscriberMessagesDataLayer.createAutopostingSubscriberMessage({
                          pageId: page.pageId,
                          companyId: message.companyId,
                          autopostingId: autopostingMessage.autopostingId,
                          autoposting_messages_id: autopostingMessage._id,
                          subscriberId: subscriber.senderId
                        })
                          .then(savedSubscriberMsg => {
                            logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to create autoposting subscriber message ${JSON.stringify(err)}`)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch autoposting message ${JSON.stringify(err)}`)
              })
          } else if (message.type === 'broadcast') {
          /* Getting the company user who has connected the facebook account */
            AutoPostingMessagesDataLayer.findOneAutopostingMessage(message.automatedMessageId)
              .then(autopostingMessage => {
                utility.callApi(`subscribers/${message.subscriberId}`)
                  .then(subscriber => {
                    utility.callApi(`pages/${subscriber.pageId}`)
                      .then(page => {
                        utility.callApi(`user/${page.userId}`)
                          .then(connectedUser => {
                            BroadcastsDataLayer.findOneBroadcast(message.automatedMessageId)
                              .then(broadcast => {
                                let currentUser = connectedUser
                                const broadcastMessages = LogicLayer.prepareDataForBroadcast(broadcast, subscriber)
                                // this calls the needle when the last message was older than 30 minutes
                                // checks the age of function using callback
                                compUtility.checkLastMessageAge(subscriber.senderId, (err, isLastMessage) => {
                                  if (err) {
                                    logger.serverLog(TAG, 'inside error')
                                    logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                  }
                                  if (isLastMessage) {
                                    for (let i = 0; i < broadcastMessages.length; i++) {
                                      let data = broadcastMessages[i]
                                      needle.post(
                                        `https://graph.facebook.com/v2.6/me/messages?access_token=${page.accessToken}`,
                                        data, (err, resp) => {
                                          if (err) {
                                            logger.serverLog(TAG, err)
                                            logger.serverLog(TAG,
                                              `Error occured at subscriber :${JSON.stringify(
                                                subscriber)}`)
                                          }
                                          BroadcastPageDataLayer.createForBroadcastPage({
                                            pageId: page.pageId,
                                            userId: currentUser._id,
                                            companyId: message.companyId,
                                            subscriberId: subscriber.senderId,
                                            broadcastId: broadcast._id,
                                            seen: false
                                          })
                                            .then(saved => {
                                              AutomationQueueDataLayer.deleteAutomationQueueObject(message._id)
                                                .then(result => {
                                                  logger.serverLog(TAG, 'successfully deleted ' + JSON.stringify(result))
                                                })
                                                .catch(err => {
                                                  logger.serverLog(TAG, `Failed to delete automation queue object ${JSON.stringify(err)}`)
                                                })
                                            })
                                            .catch(err => {
                                              logger.serverLog(TAG, `Failed to create page broadcast ${JSON.stringify(err)}`)
                                            })
                                        })
                                    }
                                  } else {
                                    logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                                    let timeNow = new Date()
                                    AutomationQueueDataLayer.updateAutomationQueueObject(message._id, {scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)})
                                      .then(updated => {
                                      })
                                      .catch(err => {
                                        logger.serverLog(TAG, `Failed to update automation queue object ${JSON.stringify(err)}`)
                                      })
                                  }
                                })
                              })
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to fetch broadcast ${JSON.stringify(err)}`)
                              })
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to fetch user ${JSON.stringify(err)}`)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch autoposting message ${JSON.stringify(err)}`)
              })
          } else if (message.type === 'bot') {
            utility.callApi(`bots/${message.automatedMessageId}`, 'get', {}, 'chat')
              .then(bot => {
                if (bot) {
                  let arr = bot.blockedSubscribers
                  arr.splice(arr.indexOf(message.subscriberId), 1)
                  bot.blockedSubscribers = arr

                  bot.save((err) => {
                    if (err) {
                      logger.serverLog(TAG, err)
                    }
                    logger.serverLog(TAG, 'removed sub-bot from queue')
                    AutomationQueueDataLayer.deleteAutomationQueueObject(message._id)
                      .then(result => {
                        logger.serverLog(TAG, 'successfully deleted ' + JSON.stringify(result))
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `Failed to delete automation queue object ${JSON.stringify(err)}`)
                      })
                  })
                }
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch bot ${JSON.stringify(err)}`)
              })
          }
        }
      }
    }
  })
  .catch(err => {
    logger.serverLog(TAG, `Failed to fetch automation queues ${JSON.stringify(err)}`)
  })

function sendAutopostingMessage (messageData, page, savedMsg) {
  request(
    {
      'method': 'POST',
      'json': true,
      'formData': messageData,
      'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
        page.accessToken
    },
    function (err, res) {
      if (err) {
        logger.serverLog(TAG,
          `At send wordpress broadcast ${JSON.stringify(
            err)}`)
      } else {
        if (res.statusCode !== 200) {
          logger.serverLog(TAG,
            `At send wordpress broadcast response ${JSON.stringify(
              res.body.error)}`)
        } else {
          AutomationQueueDataLayer.deleteAutomationQueueObject(savedMsg._id)
            .then(result => {
              logger.serverLog(TAG, 'successfully deleted ' + JSON.stringify(result))
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to delete automation queue object ${JSON.stringify(err)}`)
            })
          // logger.serverLog(TAG,
          //   `At send tweet broadcast response ${JSON.stringify(
          //   res.body.message_id)}`, true)
        }
      }
    })
  // AutopostingMessages.update({_id: savedMsg._id}, {payload: messageData}, (err, updated) => {
  //   if (err) {
  //     logger.serverLog(TAG, `ERROR at updating AutopostingMessages ${JSON.stringify(err)}`)
  //   }
  // })
}
