exports.getNormalizedMessageStatusData = (event) => {
  return {
    messageId: event.payload.gsId,
    status: event.payload.type === 'read' ? 'seen' : event.payload.type
  }
}
