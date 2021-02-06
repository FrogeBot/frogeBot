require("dotenv").config()

function cmdFunc(msg, args) {
    delete require.cache[require.resolve("../helpList.json")];
    let cmdHelpList = require("../helpList.json")
    msg.channel.send({
        "embed": {
            "title": "Help",
            "description": Object.keys(cmdHelpList).map(key => { return "**"+key+"**" + ' ' + cmdHelpList[key] }).join('\n'),
            "color": 3394611,
            "footer": {
              "text": "Page 1 of 1"
            },
            "author": {
                "name": "FrogeBot",
                "icon_url": msg.client.user.displayAvatarURL()
            }
        }
    })
}

module.exports = {
    cmdFunc
}