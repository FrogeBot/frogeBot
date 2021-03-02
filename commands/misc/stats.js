require("dotenv").config();
const { formatDuration } = require("../../modules/utils")

async function cmdFunc(msg, args, startTime) {
  // Send the stats embed
  msg.channel.send({
    "embed": {
        "title": `Stats`,
        "color": Number(process.env.EMBED_COLOUR),
        "footer": {
          "text": `FrogeBot v${process.env.npm_package_version}`
        },
        "fields": [
          { 
            "name": "Uptime",
            "value": `${formatDuration(msg.client.uptime)}`
          },
          {
            "name": "Discord API ping",
            "value": `${msg.client.ws.ping}ms`
          },
          {
            "name": "Command uses (resets on restart)",
            "value": `${cmdUses}`
          },
          { 
            "name": "GitHub",
            "value": "[View source code](https://github.com/FrogeBot/frogeBot)"
          },
        ],
        "author": {
            "name": process.env.BOT_NAME,
            "icon_url": msg.client.user.displayAvatarURL()
        }
    }
})
}

module.exports = {
  cmdFunc,
};
