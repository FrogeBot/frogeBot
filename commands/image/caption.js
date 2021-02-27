require("dotenv").config()

let { findImage, sendImage } = require("../../modules/utils.js")
var Jimp = require('jimp');

let { exec, jimpReadURL, readBuffer } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE })
let { canvasText, canvasRect } = require("../../modules/canvas.js")

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        // Send processing message
        procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
        msg.channel.startTyping()
        
        imageUrl = await findImage(msg) // Find image in channel
        let extension = imageUrl.split("?")[0].split(".")[imageUrl.split(".").length-1]; // Get extension of image

        let imgFG = await jimpReadURL(imageUrl); // imageUrl to Jimp image

        let textCanvas = await canvasText(args, Math.round(imgFG.bitmap.width*0.08), "Roboto", Math.round(imgFG.bitmap.width*0.85), "center", 1.5, "black") // Create text
        let offset = textCanvas[1]+Math.round(imgFG.bitmap.width*0.15); // Calculate image offset
        
        let rectCanvas = await canvasRect(imgFG.bitmap.width, offset, "transparent", 0, "white") // Create text background

        textCanvas[0] = await (await readBuffer(textCanvas[0])).crop(0, 0, Math.round(imgFG.bitmap.width*0.85), textCanvas[1]).getBufferAsync(Jimp.AUTO) // Crop text canvas

        let img = await exec(imageUrl, [
            ["addBackground", [imgFG.bitmap.width, imgFG.bitmap.height+offset, 'transparent', 0, offset]],
            ["composite", [rectCanvas, 0, 0]],
            ["composite", [textCanvas[0], Math.round(imgFG.bitmap.width*0.075), Math.round(imgFG.bitmap.width*0.1)]]
        ]); // Execute image manipulation

        sendImage(msg, "Caption", startTime, img, extension, procMsg) // Send image
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send({
            embed: {
                "title": "Error",
                "description": `<@${msg.author.id}> - ${ imageUrl != undefined ? process.env.MSG_ERROR : process.env.MSG_NO_IMAGE}`,
                "color": Number(process.env.EMBED_COLOUR),
                "timestamp": new Date(),
                "author": {
                    "name": process.env.BOT_NAME,
                    "icon_url": msg.client.user.displayAvatarURL()
                }
            }
        })
        procMsg.delete();
    }
}

module.exports = {
    cmdFunc
}