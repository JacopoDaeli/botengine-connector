'use strict'

module.exports = {
  env: process.env.ENV || 'development',
  app: {
    name: 'BotEngine Connector',
    port: process.env.APP_PORT || 5000
  },
  messenger: {
    appSecret: process.env.MESSENGER_APP_SECRET,
    validationToken: process.env.MESSENGER_VALIDATION_TOKEN,
    pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN
  },
  botengine: {
    app: {
      id: process.env.BOTENGINE_APP_ID || 'YourAppId',
      secret: process.env.BOTENGINE_APP_SECRET || 'YourAppSecret'
    },
    botEndpoint: process.env.BOTENGINE_BOT_ENDPOINT || 'http://localhost:3978/api/v1.0/messages'
  }
}
