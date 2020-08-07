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
    finalCriteria = [
      { $sort: { datetime: -1 } },
      { $match: { $and: [findCriteria, { _id: { $lt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    finalCriteria = [
      { $sort: { datetime: -1 } },
      { $match: { $and: [findCriteria, { _id: { $gt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}
exports.prepareFlockSendPayload = (data) => {
  let MessageObject = {
    token: data.accessToken,
    number_details: JSON.stringify(data.numbers),
    template_name: data.payload.templateName,
    template_argument: data.payload.templateArguments,
    language: 'en'
  }
  return MessageObject
}
exports.prepareChat = (data, contact) => {
  let MessageObject = {
    senderNumber: data.whatsApp.businessNumber,
    senderNumber: data.senderNumber,
    recipientNumber: contact.number,
    contactId: contact._id,
    companyId: data.companyId,
    payload: data.payload,
    repliedBy: {
      id: data.user._id,
      name: data.user.name,
      type: 'agent'
    }
  }
  return MessageObject
}
