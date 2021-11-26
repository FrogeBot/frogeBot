require("dotenv").config()

async function cmdFunc(msg, args, startTime) {
    if(process.env.ENABLE_SUPER_SECRET_TROLE_COMMANDS != "true") return // If troll commands are not emabled
    
    msg.reply({ // Send "booba"
        embeds: [{
            "title": "Booba",
            "description": `<@${msg.member.id}> ${process.env.MSG_SUCCESS}`,
            "color": Number(process.env.EMBED_COLOUR),
            "timestamp": new Date(),
            "author": {
                "name": process.env.BOT_NAME,
                "icon_url": msg.client.user.displayAvatarURL()
            },
            "image": {
                url: "attachment://booba.png"
            }
        }],
        files: [{ attachment: __dirname+"/../../assets/booba.png", name: "booba.png" }] // "Booba" APNG for the funny
    })
}

module.exports = {
    cmdFunc
}