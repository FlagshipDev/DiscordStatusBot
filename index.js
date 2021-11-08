const { start } = require('./bot.js')
const config = require('./config')
const dotenv = require('dotenv')
dotenv.config()


console.log(config.BOT_TOKEN)
console.log(process.env.BOT_TOKEN)

//start()