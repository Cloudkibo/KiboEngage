exports.preparePortinPayload = (body) => {
  let data = {
    siteId: body.siteId,
    peerId: body.peerId,
    billingTelephoneNumber: body.businessNumber,
    subscriber: body.subscriber,
    loaAuthorizingPerson: body.loaAuthorizingPerson,
    listOfPhoneNumbers: {
      phoneNumber: body.businessNumber
    },
    billingType: 'PORTIN'
  }
  return data
}
