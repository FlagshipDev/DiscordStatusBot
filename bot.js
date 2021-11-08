'use strict';

const { Client, Intents } = require('discord.js');
const fetchTimeout = require('fetch-timeout');
const config = require('./config')

if (Discord.version.startsWith('12.')) {
  Discord.RichEmbed = Discord.MessageEmbed;
  Discord.TextChannel.prototype.fetchMessage = function(snowflake) {
    return this.messages.fetch.apply(this.messages,[snowflake]);
  }
  Object.defineProperty(Discord.User.prototype,'displayAvatarURL',{
    'get': function() {
      return this.avatarURL();
    }
  })
}

const LOG_LEVELS = {
  'ERROR': 3,
  'INFO': 2,
  'DEBUG': 1,
  'SPAM': 0
}

const BOT_CONFIG = {
  'apiRequestMethod': 'sequential',
  'messageCacheMaxSize': 50,
  'messageCacheLifetime': 0,
  'messageSweepInterval': 0,
  'fetchAllMembers': false,
  'disableEveryone': true,
  'sync': false,
  'restWsBridgeTimeout': 5000, // check these
  'restTimeOffset': 300,
  'disabledEvents': [
    'CHANNEL_PINS_UPDATE',
    'TYPING_START'
  ],
  'ws': {
    'large_threshold': 100,
    'compress': true
  }
}

const USER_AGENT = `Flagship bot ${require('./package.json').version} , Node ${process.version} (${process.platform}${process.arch})`;

exports.start = function() {
  const URL_PLAYERS_FIVEM = new URL('/players.json',config.URL_SERVER_FIVEM).toString();
  const URL_PLAYERS_REDM = new URL('/players.json',config.URL_SERVER_REDM).toString();
  //const URL_INFO_FIVEM = new URL('/info.json', URL_SERVER_FIVEM).toString();
  //const URL_INFO_REDM = new URL('/info.json', URL_SERVER_REDM).toString();
  const MAX_PLAYERS_FIVEM = config.MAX_PLAYERS_FIVEM;
  const MAX_PLAYERS_REDM = config.MAX_PLAYERS_REDM;
  const TICK_MAX = 1 << 9;
  const FETCH_TIMEOUT = 900;
  const FETCH_OPS = {
    'cache': 'no-cache',
    'method': 'GET',
    'headers': { 'User-Agent': USER_AGENT }
  };

  const LOG_LEVEL = config.LOG_LEVEL !== undefined ? parseInt(config.LOG_LEVEL) : LOG_LEVELS.INFO;
  const BOT_TOKEN = config.BOT_TOKEN;
  const CHANNEL_ID = config.CHANNEL_ID;
  const MESSAGE_ID = config.MESSAGE_ID;
  const UPDATE_TIME = 2500;

  var TICK_N = 0;
  var MESSAGE;
  var LAST_COUNT;
  var STATUS;

  var loop_callbacks = [];

  const log = function(level,message) {
    if (level >= LOG_LEVEL) console.log(`${new Date().toLocaleString()} :${level}: ${message}`);
  };

  const getPlayersFiveM = function() {
    return new Promise((resolve,reject) => {
      fetchTimeout(URL_PLAYERS_FIVEM, FETCH_OPS, FETCH_TIMEOUT).then((res) => {
        res.json().then((players) => {
          resolve(players);
        }).catch(reject);
      }).catch(reject);
    })
  };

  const getPlayersRedM = function() {
    return new Promise((resolve,reject) => {
      fetchTimeout(URL_PLAYERS_REDM, FETCH_OPS, FETCH_TIMEOUT).then((res) => {
        res.json().then((players) => {
          resolve(players);
        }).catch(reject);
      }).catch(reject);
    })
  };

  //const bot = new Discord.Client(BOT_CONFIG);

  const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

  const sendOrUpdate = function(embed) {
    if (MESSAGE !== undefined) {
      MESSAGE.edit(embed).then(() => {
        log(LOG_LEVELS.DEBUG,'Update success');
      }).catch(() => {
        log(LOG_LEVELS.ERROR,'Update failed');
      })
    } else {
      let channel = bot.channels.get(CHANNEL_ID);
      if (channel !== undefined) {
        channel.fetchMessage(MESSAGE_ID).then((message) => {
          MESSAGE = message;
          message.edit(embed).then(() => {
            log(LOG_LEVELS.SPAM,'Update success');
          }).catch(() => {
            log(LOG_LEVELS.ERROR,'Update failed');
          });
        }).catch(() => {
          channel.send(embed).then((message) => {
            MESSAGE = message;
            log(LOG_LEVELS.INFO,`Sent message (${message.id})`);
          }).catch(console.error);
        })
      } else {
        log(LOG_LEVELS.ERROR,'Update channel not set');
      }
    }
  };

  const UpdateEmbed = function() {
    let dot = TICK_N % 2 === 0 ? 'Despiadados' : 'Community';
    let embed = new Discord.RichEmbed()
    .setAuthor("Estado de los servidores", "https://imgur.com/HbuKkGt.png")
    .setColor(0x2894C2)
    .setFooter(TICK_N % 2 === 0 ? '⚪ Despiadados' : '⚫ Status')
    .setTimestamp(new Date())
    if (STATUS !== undefined)
    {
      embed.addField(':warning: Estado del servidor:',`${STATUS}\n\u200b\n`);
      embed.setColor(0xff5d00)
    }
    return embed;
  };

  const offline = function() {
    log(LOG_LEVELS.SPAM,Array.from(arguments));
    if (LAST_COUNT !== null) log(LOG_LEVELS.INFO,`Servidor offline ${URL_SERVER} (${URL_PLAYERS} ${URL_INFO})`);
    let embed = UpdateEmbed()
    .setColor(0xff0000)
    .addField('Estado del servidor',':x: Offline',true)
    .addField('Jugadores en línea','?\n\u200b\n',true);
    sendOrUpdate(embed);
    LAST_COUNT = null;
  };

  const updateMessage = function() {
    getPlayersRedM().then((playersRedM) => {
      getPlayersFiveM().then((playersFiveM) => {
        let embed = UpdateEmbed()
        .addField('GTA V',':white_check_mark: Online',true)
        .addField('Jugadores en línea',`${playersFiveM.length}/${MAX_PLAYERS_FIVEM}\n\u200b\n`,true)
        .addField('\u200b','\u200b\n\u200b\n',true) 
        .addField('Red Dead Redemption',':white_check_mark: Online',true)
        .addField('Jugadores en línea',`${playersRedM.length}/${MAX_PLAYERS_REDM}\n\u200b\n`,true)
        .addField('\u200b','\u200b\n\u200b\n',true);
        sendOrUpdate(embed);
      }).catch(offline);
    }).catch(offline);
    TICK_N++;
    if (TICK_N >= TICK_MAX) {
      TICK_N = 0;
    }
    for (var i=0;i<loop_callbacks.length;i++) {
      let callback = loop_callbacks.pop(0);
      callback();
    }
  };

  bot.on('ready',() => {
    log(LOG_LEVELS.INFO,'Started...');
    bot.user.setActivity('Programando',{'url':'https://www.twitch.tv/theflagship','type':'STREAMING'});
    bot.generateInvite(['ADMINISTRATOR']).then((link) => {
      log(LOG_LEVELS.INFO,`Invite URL - ${link}`);
    }).catch(null);
    bot.setInterval(updateMessage, UPDATE_TIME);
  });

  function checkLoop() {
    return new Promise((resolve,reject) => {
      var resolved = false;
      let id = loop_callbacks.push(() => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        } else {
          log(LOG_LEVELS.ERROR,'Loop callback called after timeout');
          reject(null);
        }
      })
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      },3000);
    })
  }

  bot.on('debug',(info) => {
    log(LOG_LEVELS.SPAM,info);
  })

  bot.on('error',(error,shard) => {
    log(LOG_LEVELS.ERROR,error);
  })

  bot.on('warn',(info) => {
    log(LOG_LEVELS.DEBUG,info);
  })

  bot.on('disconnect',(devent,shard) => {
    log(LOG_LEVELS.INFO,'Disconnected');
    checkLoop().then((running) => {
      log(LOG_LEVELS.INFO,`Loop still running: ${running}`);
    }).catch(console.error);
  })

  bot.on('reconnecting',(shard) => {
    log(LOG_LEVELS.INFO,'Reconnecting');
    checkLoop().then((running) => {
      log(LOG_LEVELS.INFO,`Loop still running: ${running}`);
    }).catch(console.error);
  })

  bot.on('resume',(replayed,shard) => {
    log(LOG_LEVELS.INFO,`Resuming (${replayed} events replayed)`);
    checkLoop().then((running) => {
      log(LOG_LEVELS.INFO,`Loop still running: ${running}`);
    }).catch(console.error);
  })
  
  bot.login(BOT_TOKEN).then(null).catch(() => {
    log(LOG_LEVELS.ERROR,'Unable to login check your login token');
    console.error(e);
    process.exit(1);
  });

  return bot;
}
