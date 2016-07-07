'use strict'

const uuid = require('node-uuid')

module.exports = {
  list: {},
  findOrCreateSession (fbid) {
    let sessionId

    Object.keys(this.list).forEach(k => {
      if (this.list[k].fbid === fbid) {
        sessionId = k
      }
    })

    if (!sessionId) {
      // No session found for user fbid, let's create a new one
      sessionId = uuid.v1()
      this.list[sessionId] = { fbid, context: {} }
    }

    return sessionId
  }
}
