const { start } = require('./bot.js')
const config = require('./config')
require('dotenv').config()


console.log(config.BOT_TOKEN)
console.log(process.env.BOT_TOKEN)

//start()