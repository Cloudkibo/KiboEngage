let utility = require('../../../components/utility')

exports.preparePayload = function (body, landingPageState, companyUser, landingPageSubmittedState) {
  let payload = {
    companyId: companyUser.companyId,
    pageId: body.pageId,
    initialState: landingPageState._id,
    submittedState: {},
    optInMessage: body.optInMessage,
    title: body.title
  }
  if (body.submittedState.actionType === 'SHOW_NEW_MESSAGE') {
    payload.submittedState = {
      actionType: body.submittedState.actionType,
      title: body.submittedState.title,
      description: body.submittedState.description,
      state:{
        backgroundColor: body.submittedState.state.backgroundColor,
        titleColor: body.submittedState.state.titleColor,
        descriptionColor: body.submittedState.state.descriptionColor,
        mediaType: body.submittedState.state.mediaType,
        mediaLink: body.submittedState.state.mediaLink,
        mediaPlacement: body.submittedState.state.mediaPlacement  
        },
      buttonText: body.submittedState.buttonText,
      
    }
  } else {
    payload.submittedState = {
      actionType: body.submittedState.actionType,
      url: utility.setProtocolUrl(body.submittedState.url),
      tab: body.submittedState.tab,
      title: body.submittedState.title,
      description: body.submittedState.description,
      buttonText: body.submittedState.buttonText
    }
  }
  return payload
}
exports.prepareUpdatePayload = function (body) {
  let paylaod = body
  if (body.submittedState.actionType === 'SHOW_NEW_MESSAGE') {
    paylaod.submittedState = {
      actionType: body.submittedState.actionType,
      title: body.submittedState.title,
      state :{
        backgroundColor: body.submittedState.state.backgroundColor,
        titleColor: body.submittedState.state.titleColor,
        descriptionColor: body.submittedState.state.descriptionColor,
        mediaType: body.submittedState.state.mediaType,
        mediaLink: body.submittedState.state.mediaLink,
        mediaPlacement: body.submittedState.state.mediaPlacement  
    },
      description: body.submittedState.description,
      buttonText: body.submittedState.buttonText,
      
    }
  } else {
    paylaod.submittedState = {
      actionType: body.submittedState.actionType,
      url: utility.setProtocolUrl(body.submittedState.url),
      tab: body.submittedState.tab,
      title: body.submittedState.title,
      description: body.submittedState.description,
      buttonText: body.submittedState.buttonText
    }
  }
  return paylaod
}
