require("dotenv").config()

let { findImage, sendImage } = require("../../modules/utils.js")
var Jimp = require('jimp');

let { exec, jimpReadURL, readBuffer } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxGifFrames: process.env.MAX_GIF_FRAMES, maxImageSize: process.env.MAX_IMAGE_SIZE })
let { canvasText, canvasRect } = require("@frogebot/canvas")

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        // Send processing message
        procMsg = await msg.reply(process.env.MSG_PROCESSING);
        // msg.channel.startTyping()
        
        imageUrl = await findImage(msg) // Find image in channel
        let extension = imageUrl.split("?")[0].split(".")[imageUrl.split(".").length-1]; // Get extension of image
        
        let imgFG = await jimpReadURL(imageUrl); // imageUrl to Jimp image
        let textCanvas = await canvasText(args[0] ? args[0] : "", Math.round(imgFG.bitmap.width*0.05), "Arial", Math.round(imgFG.bitmap.width*0.9), "left") // Create text
        let offset = textCanvas[1]+Math.round(imgFG.bitmap.width*0.075); // Calculate image offset

        let rectCanvas = await canvasRect(imgFG.bitmap.width, offset, "transparent", 0, "white") // Create text background

        textCanvas[0] = await (await readBuffer(textCanvas[0])).crop(0, 0, Math.round(imgFG.bitmap.width*0.9), textCanvas[1]).getBufferAsync(Jimp.AUTO) // Crop text canvas

        let img = await exec(imageUrl, [
            ["addBackground", [imgFG.bitmap.width, imgFG.bitmap.height+offset, 'transparent', 0, 0]],
            ["composite", [rectCanvas, 0, imgFG.bitmap.height]],
            ["composite", [textCanvas[0], Math.round(imgFG.bitmap.width*0.05), imgFG.bitmap.height+Math.round(imgFG.bitmap.width*0.05)]]
        ], msg); // Execute image manipulation

        sendImage(msg, "Caption 2", startTime, img, extension, procMsg) // Send image
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