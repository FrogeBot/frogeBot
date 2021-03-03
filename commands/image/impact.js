require("dotenv").config()

let { findImage, sendImage } = require("../../modules/utils.js")

let { jimpReadURL, execGM, gmToBuffer } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE })
let { canvasText, canvasWindow } = require("@frogebot/canvas");

var gm = require('gm');
if(process.env.USE_IMAGEMAGICK == "true") {
    gm = gm.subClass({ imageMagick: true });
}

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        // Send processing message
        procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
        msg.channel.startTyping()

        imageUrl = await findImage(msg) // Find image in channel
        let extension = imageUrl.split(".")[imageUrl.split(".").length-1].split("?")[0];

        let imgFG = await jimpReadURL(imageUrl); // imageUrl to Jimp image

        let height = Math.round(imgFG.bitmap.height); // Calculate new height
        let width = Math.round(imgFG.bitmap.width); // Calculate new width

        let textCanvas = await canvasText(args.split("|")[0].trim(), Math.round(width*0.1), "Impact", Math.round(width*0.9), "center", 1.5, "white", "transparent", "black", Math.round(width*0.0125)) // Create top text
        let textCanvas2 = await canvasText(args.split("|").slice(1).join("|").trim(), Math.round(width*0.1), "Impact", Math.round(width*0.9), "center", 1.5, "white", "transparent", "black", Math.round(width*0.0125)) // Create bottom text

        textCanvas[0] = await gmToBuffer(gm(textCanvas[0]).crop(width, Math.min(textCanvas[1], height))) // Crop top text
        textCanvas2[0] = await gmToBuffer(gm(textCanvas2[0]).crop(width, textCanvas2[1])) // Crop bottom text

        let img = await execGM(imageUrl, [
            ["composite", [textCanvas[0], Math.round(width*0.05), Math.round(width*0.05 - imgFG.bitmap.width*0.025)]],
            ["composite", [textCanvas2[0], Math.round(width*0.05), Math.round(height - width*0.05 + imgFG.bitmap.width*0.025)]]
        ]) // Execute image manipulation
        
        sendImage(msg, "Impact", startTime, img, extension, procMsg) // Send image
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