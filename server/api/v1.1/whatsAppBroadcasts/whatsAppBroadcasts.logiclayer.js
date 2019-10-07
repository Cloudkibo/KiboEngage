exports.prepareChat = (payload, companyUser, contact) => {
  let MessageObject = {
    senderNumber: companyUser.companyId.twilioWhatsApp.sandboxNumber,
    recipientNumber: contact.number,
    contactId: contact._id,
    companyId: companyUser.companyId._id,
    payload: payload[0]
  }
  return MessageObject
}
exports.getCriterias = function (body, companyUser) {
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    companyId: companyUser.companyId
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]

  if (body.first_page === 'first') {
    if (body.current_page) {
      recordsToSkip = Math.abs(body.current_page * body.number_of_records)
    }
    finalCriteria = [
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}
exports.prepareBroadCastPayload = function (req, companyId) {
  let broadcastPayload = {
    platform: req.body.platform,
    payload: req.body.payload,
    userId: req.user._id,
    companyId,
    title: req.body.title
  }
  if (req.body.segmentation) {
    broadcastPayload.segmentation = req.body.segmentation
  }
  return broadcastPayload
}
exports.checkFilterValues = function (values, data) {
  var matchCriteria = true
  if (values.length > 0) {
    for (var i = 0; i < values.length; i++) {
      var filter = values[i]
      if (filter.criteria === 'is') {
        if (data[`${filter.condition}`] === filter.text) {
          matchCriteria = true
        } else {
          matchCriteria = false
          break
        }
      } else if (filter.criteria === 'contains') {
        if (data[`${filter.condition}`].toLowerCase().includes(filter.text.toLowerCase())) {
          matchCriteria = true
        } else {
          matchCriteria = false
          break
        }
      } else if (filter.criteria === 'begins') {
        var subText = data[`${filter.condition}`].substring(0, filter.text.length)
        if (subText.toLowerCase() === filter.text.toLowerCase()) {
          matchCriteria = true
        } else {
          matchCriteria = false
          break
        }
      }
    }
  }
  return matchCriteria
}
