require("dotenv").config()

let { findImage, sendImage, clamp } = require("../../modules/utils.js")

let { execGM } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxGifFrames: process.env.MAX_GIF_FRAMES, maxImageSize: process.env.MAX_IMAGE_SIZE })

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        // Send processing message
        procMsg = await msg.reply(process.env.MSG_PROCESSING);
        // msg.channel.startTyping()
        
        imageUrl = await findImage(msg) // Find image in channel
        let extension = imageUrl.split("?")[0].split(".")[imageUrl.split(".").length-1]; // Get extension of image

        let r = (args[0] && Number.isInteger(Number(args[0]))) ? Number(args[0]) : 10;
        let img = await execGM(imageUrl, [ ["jpeg", [clamp(r, 0, 100)]] ], msg); // Execute image manipulation
        
        sendImage(msg, "JPEG", startTime, img, ( extension == "gif" ? "gif" : "jpg" ), procMsg) // Send image
    } catch(e) {
        console.log(e)
        // msg.channel.stopTyping()
        msg.followUp({
            embeds: [{
                "title": "Error",
                "description": `<@${msg.member.id}> - ${ imageUrl != undefined ? process.env.MSG_ERROR : process.env.MSG_NO_IMAGE}`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }]
        })
        // procMsg.delete();
    }
}

module.exports = {
    cmdFunc
}