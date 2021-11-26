require("dotenv").config()

async function cmdFunc(msg, args, startTime) {
    if(process.env.ENABLE_SUPER_SECRET_TROLE_COMMANDS != "true") return // If troll commands are not emabled
    
    if(!msg.channel.nsfw) { // If the channel isn't set as NSFW
        msg.reply({ // Tell them to try in an nsfw channel
            embeds: [{
                "title": "Floof",
                "description": `<@${msg.member.id}> - ${process.env.MSG_ERROR} - This command must be run in an NSFW channel`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }]
        })
    } // Bruh you really thought I was gonna make NSFW commands?
}

module.exports = {
    cmdFunc
}