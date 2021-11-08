const dotenv = require('dotenv')

dotenv.config()

module.exports = {
    URL_SERVER_FIVEM: process.env.URL_SERVER_FIVEM,
    URL_SERVER_REDM: process.env.URL_SERVER_REDM,
    MAX_PLAYERS_FIVEM: process.env.MAX_PLAYERS_FIVEM,
    MAX_PLAYERS_REDM: process.env.MAX_PLAYERS_REDM,
    LOG_LEVEL: process.env.LOG_LEVEL,
    BOT_TOKEN: process.env.BOT_TOKEN,
    CHANNEL_ID: process.env.CHANNEL_ID,
    MESSAGE_ID: process.env.MESSAGE_ID
}