const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/profilePic.controller'
const config = require('../../../../server/config/environment')

exports.policyNotification = function (req, res) {
  callApi(`pages/query`, 'post', {pageId: req.body.pageId})
    .then(pages => {
      let users = []
      for (let i = 0; i < pages.length; i++) {
        users.push(pages[i].userId)
      }
      let uniqueUsers = unique(users, '_id')
      for (let i = 0; i < uniqueUsers.length; i++) {
        let user = users[0]
        let sendgrid = require('sendgrid')(config.SENDGRID_API_KEY)
        let email = new sendgrid.Email({
          to: user.email,
          from: 'support@cloudkibo.com',
          subject: 'Facebook Page Policy Violation',
          text: "Your Facebook page is violating Facebook's terms of service"
        })
        var emailText = `Your page ${pages[0].pageName} is blocked because of ${req.body.policy.reason}`
        email.setHtml(
          '<body style="min-width: 80%;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;margin: 0;padding: 0;direction: ltr;background: #f6f8f1;width: 80% !important;"><table class="body", style="width:100%"> ' +
              '<tr> <td class="center" align="center" valign="top"> <!-- BEGIN: Header --> <table class="page-header" align="center" style="width: 100%;background: #1f1f1f;"> <tr> <td class="center" align="center"> ' +
              '<!-- BEGIN: Header Container --> <table class="container" align="center"> <tr> <td> <table class="row "> <tr>  </tr> </table> <!-- END: Logo --> </td> <td class="wrapper vertical-middle last" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;"> <!-- BEGIN: Social Icons --> <table class="six columns"> ' +
              '<tr> <td> <table class="wrapper social-icons" align="right" style="float: right;"> <tr> <td class="vertical-middle" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;padding: 0 2px !important;width: auto !important;"> ' +
              '<p style="color: #ffffff">Page Policy Violation</p> </td></tr> </table> </td> </tr> </table> ' +
              '<!-- END: Social Icons --> </td> </tr> </table> </td> </tr> </table> ' +
              '<!-- END: Header Container --> </td> </tr> </table> <!-- END: Header --> ' +
              '<!-- BEGIN: Content --> <table class="container content" align="center"> <tr> <td> <table class="row note"> ' +
             '<tr> <td class="wrapper last"> <p> Hello, <br> ' +
             emailText +
             '<!-- END: Content -->' +
             '<!-- BEGIN: Footer --> <table class="page-footer" align="center" style="width: 100%;background: #2f2f2f;"> <tr> <td class="center" align="center" style="vertical-align: middle;color: #fff;"> <table class="container" align="center"> <tr> <td style="vertical-align: middle;color: #fff;"> <!-- BEGIN: Unsubscribet --> <table class="row"> <tr> <td class="wrapper last" style="vertical-align: middle;color: #fff;"><span style="font-size:12px;"><i>This ia a system generated email and reply is not required.</i></span> </td> </tr> </table> <!-- END: Unsubscribe --> ' +
             '<!-- END: Footer Panel List --> </td> </tr> </table> </td> </tr> </table> <!-- END: Footer --> </td> </tr></table></body>')

        sendgrid.send(email, function (err, json) {
          if (err) {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.policyNotification`, req.body, {user: req.user}, 'error')
          }
        })
      }
      return res.status(200).json({
        status: 'success',
        description: `policy block notifications sent`
      })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.policyNotification`, req.body, {user: req.user}, 'error')
      return res.status(500).json({
        status: 'error',
        description: `error: ${err}`
      })
    })
}

function unique (array, propertyName) {
  return array.filter((e, i) => array.findIndex(a => a[propertyName] === e[propertyName]) === i)
}
