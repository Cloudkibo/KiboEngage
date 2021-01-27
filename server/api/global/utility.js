const {callApi} = require('../v1.1/utility')
const compose = require('composable-middleware')
const logger = require('../../components/logger')
const config = require('./../../config/environment')
const nodemailer = require('nodemailer')
const TAG = 'server/api/global/utility'
const _ = require('lodash')
const ogs = require('open-graph-scraper')

exports.createMessageBlocks = (linkedMessages, user, moduleId, moduleType) => {
  let messageBlockRequests = []
  for (let i = 0; i < linkedMessages.length; i++) {
    let linkedMessage = linkedMessages[i]
    let data = {
      module: {
        id: moduleId,
        type: moduleType
      },
      title: linkedMessage.title,
      uniqueId: linkedMessage.id.toString(),
      payload: linkedMessage.messageContent,
      userId: user._id,
      companyId: user.companyId
    }
    messageBlockRequests.push(callApi(`messageBlocks/`, 'post', data, 'kiboengage'))
  }
  return Promise.all(messageBlockRequests)
}

exports.prepareSubscribersCriteria = (body, page, lists, payloadLength, isApprovedForSMP) => {
  if (
    !body ||
    (Object.entries(body).length === 0 && body.constructor === Object)
  ) throw Error('body is required and cannot be empty!')
  else if (
    !page ||
    (Object.entries(page).length === 0 && page.constructor === Object)
  ) throw Error('page is required and cannot be empty!')
  else {
    let smp = false
    if (isApprovedForSMP === 'approved' || isApprovedForSMP === true) {
      smp = true
    }
    let criteria = {
      pageId: page._id,
      companyId: page.companyId,
      isSubscribed: true,
      completeInfo: true,
      lastMessagedAt: (!smp) ? {
        $gt: new Date((new Date().getTime() - (24 * 60 * 60 * 1000)))
      } : undefined
    }
    if (body.isList) {
      if (
        !lists ||
        lists.length === 0
      ) throw Error('lists is required and cannot be empty!')
      else {
        lists = [].concat(lists)
        lists = lists.map((l) => l.content)
        lists = [].concat.apply([], lists)
        lists = lists.filter((item, i, arr) => arr.indexOf(item) === i)
        criteria = _.merge(criteria, {_id: {$in: lists}})
      }
    } else if (body.isSegmented) {
      if (body.segmentationGender.length > 0) criteria = _.merge(criteria, {gender: {$in: body.segmentationGender}})
      if (body.segmentationLocale.length > 0) criteria = _.merge(criteria, {locale: {$in: body.segmentationLocale}})
    }
    let finalCriteria = [
      {$match: criteria},
      {$limit: 50 / payloadLength}
    ]
    return finalCriteria
  }
}

exports.getScheduledTime = (interval) => {
  let hours
  if (interval === '24 hours') {
    hours = 24
  } else if (interval === '12 hours') {
    hours = 12
  } else if (interval === '8 hours') {
    hours = 8
  }
  let date = new Date()
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000))
  return date
}

const getEmailObject = (to, from, subject, text, errorMessage, code, subCode, codePart, pageId, userId, companyId) => {
  let email = {
    to: to,
    from: from,
    subject: subject,
    text: text
  }
  email.html =
    '<body style="min-width: 80%;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;margin: 0;padding: 0;direction: ltr;background: #f6f8f1;width: 80% !important;"><table class="body", style="width:100%"> ' +
    '<tr> <td class="center" align="center" valign="top"> <!-- BEGIN: Header --> <table class="page-header" align="center" style="width: 100%;background: #1f1f1f;"> <tr> <td class="center" align="center"> ' +
    '<!-- BEGIN: Header Container --> <table class="container" align="center"> <tr> <td> <table class="row "> <tr>  </tr> </table> <!-- END: Logo --> </td> <td class="wrapper vertical-middle last" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;"> <!-- BEGIN: Social Icons --> <table class="six columns"> ' +
    '<tr> <td> <table class="wrapper social-icons" align="right" style="float: right;"> <tr> <td class="vertical-middle" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;padding: 0 2px !important;width: auto !important;"> ' +
    '<p style="color: #ffffff"> KiboPush - Facebook API Error </p> </td></tr> </table> </td> </tr> </table> ' +
    '<!-- END: Social Icons --> </td> </tr> </table> </td> </tr> </table> ' +
    '<!-- END: Header Container --> </td> </tr> </table> <!-- END: Header --> <!-- BEGIN: Content --> <table class="container content" align="center"> <tr> <td> <table class="row note"> ' +
    '<tr> <td class="wrapper last"> <p> Hello, <br> This is to inform you  that following facebook error has occurred on KiboPush. </p> <p> </p>  <!-- BEGIN: Note Panel --> <table class="twelve columns" style="margin-bottom: 10px"> ' +
    '<tr> <td class="panel" style="background: #ECF8FF;border: 0;padding: 10px !important;"> </td> <td class="expander"> </td> </tr> </table> <p> <b>Error Message:</b> ' + errorMessage + ' <br><br>' +
    '<b>Area Where It occurred: </b> ' + codePart + ' <br><br>' +
    '<b>Error Code: </b> ' + code + ' <br><br>' +
    '<b>Error Sub Code: </b> ' + subCode + ' <br><br>' +
    '<b>PageID: </b> ' + pageId + ' <br><br>' +
    '<b>UserID: </b> ' + userId + ' <br><br>' +
    '<b>CompanyID: </b> ' + companyId + ' ' +
    '</p> <!-- END: Note Panel --> </td> </tr> </table><span class="devider" style="border-bottom: 1px solid #eee;margin: 15px -15px;display: block;"></span> <!-- END: Disscount Content --> </td> </tr> </table> </td> </tr> </table> <!-- END: Content --> <!-- BEGIN: Footer --> <table class="page-footer" align="center" style="width: 100%;background: #2f2f2f;"> <tr> <td class="center" align="center" style="vertical-align: middle;color: #fff;"> <table class="container" align="center"> <tr> <td style="vertical-align: middle;color: #fff;"> <!-- BEGIN: Unsubscribet --> <table class="row"> <tr> <td class="wrapper last" style="vertical-align: middle;color: #fff;"><span style="font-size:12px;"><i>This is a system generated email and reply is not required.</i></span> </td> </tr> </table> <!-- END: Unsubscribe --> ' +
    '<!-- END: Footer Panel List --> </td> </tr> </table> </td> </tr> </table> <!-- END: Footer --> </td> </tr></table></body>'
  return email
}

const getPlainEmailObject = (to, from, subject, text, errorMessage, codePart) => {
  let email = {
    to: to,
    from: from,
    subject: subject,
    text: text
  }
  email.html =
    '<body style="min-width: 80%;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;margin: 0;padding: 0;direction: ltr;background: #f6f8f1;width: 80% !important;"><table class="body", style="width:100%"> ' +
    '<tr> <td class="center" align="center" valign="top"> <!-- BEGIN: Header --> <table class="page-header" align="center" style="width: 100%;background: #1f1f1f;"> <tr> <td class="center" align="center"> ' +
    '<!-- BEGIN: Header Container --> <table class="container" align="center"> <tr> <td> <table class="row "> <tr>  </tr> </table> <!-- END: Logo --> </td> <td class="wrapper vertical-middle last" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;"> <!-- BEGIN: Social Icons --> <table class="six columns"> ' +
    '<tr> <td> <table class="wrapper social-icons" align="right" style="float: right;"> <tr> <td class="vertical-middle" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;padding: 0 2px !important;width: auto !important;"> ' +
    '<p style="color: #ffffff"> KiboPush - Reconnect Facebook Account </p> </td></tr> </table> </td> </tr> </table> ' +
    '<!-- END: Social Icons --> </td> </tr> </table> </td> </tr> </table> ' +
    '<!-- END: Header Container --> </td> </tr> </table> <!-- END: Header --> <!-- BEGIN: Content --> <table class="container content" align="center"> <tr> <td> <table class="row note"> ' +
    '<tr> <td class="wrapper last"> <p> Hello, <br> ' + text + '</p> <p> </p>  <!-- BEGIN: Note Panel --> <table class="twelve columns" style="margin-bottom: 10px"> ' +
    '<tr> <td class="panel" style="background: #ECF8FF;border: 0;padding: 10px !important;"> </td> <td class="expander"> </td> </tr> </table> ' +
    '<!-- END: Note Panel --> </td> </tr> </table><span class="devider" style="border-bottom: 1px solid #eee;margin: 15px -15px;display: block;"></span> <!-- END: Disscount Content --> </td> </tr> </table> </td> </tr> </table> <!-- END: Content --> <!-- BEGIN: Footer --> <table class="page-footer" align="center" style="width: 100%;background: #2f2f2f;"> <tr> <td class="center" align="center" style="vertical-align: middle;color: #fff;"> <table class="container" align="center"> <tr> <td style="vertical-align: middle;color: #fff;"> <!-- BEGIN: Unsubscribet --> <table class="row"> <tr> <td class="wrapper last" style="vertical-align: middle;color: #fff;"><span style="font-size:12px;"><i>This is a system generated email and reply is not required.</i></span> </td> </tr> </table> <!-- END: Unsubscribe --> ' +
    '<!-- END: Footer Panel List --> </td> </tr> </table> </td> </tr> </table> <!-- END: Footer --> </td> </tr></table></body>'
  return email
}

const passwordChangeEmailAlert = function (userId, userEmail) {
  let body = {
    query: {
      _id: userId
    },
    newPayload: {
      connectFacebook: false
    },
    options: {}
  }
  callApi(`user/update`, 'post', body)
    .then(response1 => {
    // sucess... Email user to reconnect facebook account
      let emailText = 'This is to inform you that you need to reconnect your Facebook account to KiboPush. On the next login on KiboPush, you will be asked to reconnect your Facebook account. This happens in cases when you change your password or disconnect KiboPush app.'
      let email = getPlainEmailObject(userEmail, 'support@cloudkibo.com', 'KiboPush: Reconnect Facebook Account', emailText)
      if (config.env === 'production') {
        let sendgrid = require('sendgrid')(config.SENDGRID_API_KEY)
        let emailObject = new sendgrid.Email(email)
        sendgrid.send(emailObject, function (err, json) {
          if (err) {
            const message = err || 'error in sending Alert email'
            logger.serverLog(message, `${TAG}: passwordChangeEmailAlert`, {userId}, {}, 'error')
          }
        })
      }
    })
    .catch(error => {
      const message = error || 'error in password change email alert'
      logger.serverLog(message, `${TAG}: exports.isApprovedForSMP`, {userId, userEmail}, {}, 'error')
    })
}
const getMailTransporter = function () {
  let transporter = nodemailer.createTransport({
    service: config.nodemailer.service,
    auth: {
      user: config.nodemailer.email,
      pass: config.nodemailer.password
    }
  })
  return transporter
}

const isEmailAddress = function (str) {
  var pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
  return pattern.test(str)
}

const isWebURL = function (str) {
  let regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/
  return regexp.test(str)
}

const isNumber = function (str) {
  var regexp = /^\d+$/
  return regexp.test(str)
}

const isPhoneNumber = function (str) {
  var regexp = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
  return regexp.test(str)
}

const domainName = function (url) {
  var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i)
  if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
    return match[2]
  } else {
    return null
  }
}

const attachBuyerInfo = function () {
  return compose().use((req, res, next) => {
    callApi(`companyUser/query`, 'post', { companyId: req.user.companyId, role: 'buyer' })
      .then(buyerInfo => {
        if (!buyerInfo) {
          return res.status(404).json({
            status: 'failed',
            description: 'The buyer account has some technical problems. Please contact support'
          })
        }
        return callApi(`user/query`, 'post', {domain_email: buyerInfo.domain_email})
      })
      .then(buyerInfo => {
        buyerInfo = buyerInfo[0]
        if (!buyerInfo) {
          return res.status(404).json({
            status: 'failed',
            description: 'The buyer account has some technical problems. Please contact support'
          })
        }
        req.user.buyerInfo = buyerInfo
        next()
      })
      .catch(error => {
        const message = error || 'Failed to fetch buyer account'
        logger.serverLog(message, `${TAG}: attachBuyerInfo`, req.body, {user: req.user}, 'error')
        return res.status(500).json({
          status: 'failed',
          payload: `Failed to fetch buyer account ${JSON.stringify(error)}`
        })
      })
  })
}

const openGraphScrapper = function (url) {
  let options = {url: url, timeout: 10000, retry: 3}
  return new Promise((resolve, reject) => {
    ogs(options, (error, results) => {
      if (error) {
        reject(results.error)
      } else {
        resolve(results.data ? results.data : results)
      }
    })
  })
}

const containsURL = function (text) {
  /* eslint-disable */
  var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  /* eslint-enable */
  return text.match(urlRegex)
}

exports.attachBuyerInfo = attachBuyerInfo
exports.openGraphScrapper = openGraphScrapper
exports.domainName = domainName
exports.getEmailObject = getEmailObject
exports.getPlainEmailObject = getPlainEmailObject
exports.passwordChangeEmailAlert = passwordChangeEmailAlert
exports.getMailTransporter = getMailTransporter
exports.isEmailAddress = isEmailAddress
exports.isWebURL = isWebURL
exports.isNumber = isNumber
exports.isPhoneNumber = isPhoneNumber
exports.containsURL = containsURL
