exports.preparePayload = function(companyId,userId){
    let payload = {
        companyId: companyId,
        userId: userId
    }

    return payload
}