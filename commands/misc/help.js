require("dotenv").config()

function cmdFunc(msg, args) {
    delete require.cache[require.resolve("../helpList.json")];
    let cmdHelpList = require("../helpList.json")

    let page = (args.length > 0 && Number.isInteger(Number(args)) && Number(args) >= 1 && Number(args) <= Math.ceil(Object.keys(cmdHelpList).length/12)) ? Number(args) : 1;

    msg.channel.send({
        "embed": {
            "title": "Help",
            "description": Object.keys(cmdHelpList).slice((page-1)*12, page*12).map(key => { return "**"+key+"**" + ' ' + cmdHelpList[key] }).join('\n')+"\n\n*GIF images are restricted to the first 30 frames.",
            "color": 3394611,
            "footer": {
              "text": `Page ${page} of ${Math.ceil(Object.keys(cmdHelpList).length/12)}`
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