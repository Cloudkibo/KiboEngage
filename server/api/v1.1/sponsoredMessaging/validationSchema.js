exports.createPayload = {
  type: 'object',
  companyId: {
    type: 'string',
    required: true
  },
  userId: {
    type: 'string',
    required: true
  }

}

exports.updatePayload = {
  type: 'object',
  companyId: {
    type: 'string',
    required: true
  },
  userId: {
    type: 'string',
    required: true
  }

}

exports.sendPayload = {
  type: 'object',
  ad_account_id: {
    type: 'string',
    required: true
  }
}
