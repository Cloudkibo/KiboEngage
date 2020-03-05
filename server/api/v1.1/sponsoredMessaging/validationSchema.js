exports.createPayload = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      required: true
    },
    adName: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    }
  }
}

exports.updatePayload = {
  type: 'object',
  properties: {
    adAccountId: {
      type: 'string',
      required: true
    }
  }
}

exports.sendPayload = {
  type: 'object',
  ad_account_id: {
    type: 'string',
    required: true
  }
}

exports.createCampaignsPayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    type: {
      type: 'string',
      required: true
    }
  }
}
