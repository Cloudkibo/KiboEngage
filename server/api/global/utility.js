const utility = require('./../../components/utility')

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
  let sendgrid = utility.getSendGridObject()
  let email = new sendgrid.Email({
    to: to,
    from: from,
    subject: subject,
    text: text
  })
  email.setHtml(
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
    '<!-- END: Footer Panel List --> </td> </tr> </table> </td> </tr> </table> <!-- END: Footer --> </td> </tr></table></body>')
  return email
}

exports.getEmailObject = getEmailObject
