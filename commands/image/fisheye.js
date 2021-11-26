require("dotenv").config()

let { findImage, sendImage } = require("../../modules/utils.js")

let { exec } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE })

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        // Send processing message
        procMsg = await msg.reply(process.env.MSG_PROCESSING);
        // msg.channel.startTyping()
        
        imageUrl = await findImage(msg) // Find image in channel
        let extension = imageUrl.split("?")[0].split(".")[imageUrl.split(".").length-1]; // Get extension of image
        
        let r = (args[0] && !Number.isNaN(Number(args[0]))) ? Number(args[0]) : 1.6; // Work out fisheye amount
        let scaleFactor = r; // Scale factor
        if(r <= 1) scaleFactor = 1/(r*r)*2; // Edge case, not even sure why I did this but it seems to work
        let img = await exec(imageUrl, [ ["fisheye", [{ r }]], ["canvasScale", [1/scaleFactor]], ["scale", [scaleFactor]] ]); // Execute image manipulation
        
        sendImage(msg, "Fisheye", startTime, img, extension, procMsg) // Send image
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
        //procMsg.delete();
    }
}

module.exports = {
    cmdFunc
}