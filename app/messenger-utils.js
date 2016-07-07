'use strict'

const crypto = require('crypto')
const shortid = require('shortid')
const config = require('./config')
const cbe = config.botengine

let nConversations = 0 // Use redis in production

exports.generateRandomSHA1 = function generateRandomSHA1() {
  const shasum = crypto.createHash('sha1')
  shasum.update(shortid.generate())
  return shasum.digest('hex')
}

exports.createInitialMessage = function createInitialMessage(fbid, text) {
  const from = {
    name: fbid,
    channelId: 'fbmessenger',
    address: fbid,
    id: fbid,
    isBot: false
  }
  const to = {
    name: cbe.app.id,
    channelId: 'fbmessenger',
    address: cbe.app.id,
    id: cbe.app.id,
    isBot: true
  }

  return {
    type: 'Message',
    id: exports.generateRandomSHA1(), // Randomly generated each time
    conversationId: shortid.generate(), // Randomly generated at the beginning of the conversation
    created: (new Date()).toString(),
    text,
    attachments: [], // no attachments
    from,
    to,
    participants: [from, to],
    totalParticipants: 2,
    mentions: [],
    channelMessageId: exports.generateRandomSHA1(), // Randomly generated each time
    channelConversationId: `Conv_${++nConversations}`,
    hashtags: []
  }
}

exports.createNextMessage = function createNextMessage(fbid, senderContext, text) {
  const from = {
    name: fbid,
    channelId: 'fbmessenger',
    address: fbid,
    id: fbid,
    isBot: false
  }
  const to = {
    name: cbe.app.id,
    channelId: 'fbmessenger',
    address: cbe.app.id,
    id: cbe.app.id,
    isBot: true
  }

  return {
    type: 'Message',
    id: exports.generateRandomSHA1(), // Randomly generated each time
    conversationId: senderContext.conversationId, // Randomly generated at the beginning of the conversation
    created: (new Date()).toString(),
    text,
    botConversationData: senderContext.botConversationData,
    botUserData: senderContext.botUserData,
    botPerUserInConversationData: senderContext.botPerUserInConversationData,
    attachments: [], // no attachments
    from,
    to,
    participants: [from, to],
    totalParticipants: 2,
    mentions: [],
    channelMessageId: exports.generateRandomSHA1(), // Randomly generated each time
    channelConversationId: senderContext.channelConversationId,
    hashtags: []
  }
}
