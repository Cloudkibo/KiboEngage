exports.preparePayload = function(companyId,userId){
    let payload = {
        companyId: companyId,
        userId: userId
    }

    return payload
}

exports.prepareUpdatePayload = function(body){
    let payload={
        _id: body._id,
        payload: body.payload,
        message_creative_id: body.message_creative_id,
        ad_set_payload: body.ad_set_payload,
        ad_id: body.ad_id,
        campaign_name: body.campaign_name,
        campaign_id: body.campaign_id,
        status: body.status,
        pageId: body.pageId,
        statsFromUs: body.statsFromUs
    }
    return payload
}