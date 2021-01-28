exports.getNormalizedMessageStatusData = (event) => {
  return {
    messageId: event.payload.id,
    status: event.payload.type === 'read' ? 'seen' : event.payload.type
  }
}
