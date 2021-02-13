require("dotenv").config()

async function cmdFunc(msg, args, startTime) {
    if(process.env.ENABLE_SUPER_SECRET_TROLE_COMMANDS != "true") return
    
    msg.channel.send({
        embed: {
            "title": "Booba",
            "description": `<@${msg.author.id}> ${process.env.MSG_SUCCESS}`,
            "color": Number(process.env.EMBED_COLOUR),
            "timestamp": new Date(),
            "author": {
                "name": process.env.BOT_NAME,
                "icon_url": msg.client.user.displayAvatarURL()
            },
            "image": {
                url: "attachment://booba.png"
            }
        },
        files: [{ attachment: __dirname+"/../../assets/booba.png", name: "booba.png" }]
    })
}

module.exports = {
    cmdFunc
}