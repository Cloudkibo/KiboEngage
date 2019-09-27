exports.createPayload = function (companyUser, body) {
  let payload = {
    companyId: companyUser.companyId,
    pageId: body.pageId,
    optInMessage: body.optInMessage,
    QRCode: body.QRCode
  }
  return payload
}
