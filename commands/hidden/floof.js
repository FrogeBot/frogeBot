require("dotenv").config()

async function cmdFunc(msg, args, startTime) {
    if(process.env.ENABLE_SUPER_SECRET_TROLE_COMMANDS != "true") return
    
    if(!msg.channel.nsfw) {
        msg.channel.send({
            embed: {
                "title": "Floof",
                "description": `<@${msg.author.id}> - ${process.env.MSG_ERROR} - This command must be run in an NSFW channel`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }
        })
    }
}

module.exports = {
    cmdFunc
}