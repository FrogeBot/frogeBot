require("dotenv").config()

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage, sendImage } = require("../../modules/utils.js")
var Jimp = require('jimp');

let { exec, jimpReadURL, readBuffer } = require("@frogebot/image")({ imageMagick: process.env.USE_IMAGEMAGICK, maxGifSize: process.env.MAX_GIF_SIZE, maxImageSize: process.env.MAX_IMAGE_SIZE })
let { canvasText, canvasRect } = require("../../modules/canvas.js")

let procMsg
let imageUrl
async function cmdFunc(msg, args, startTime) {
    try {
        procMsg = await msg.channel.send(process.env.MSG_PROCESSING);
        msg.channel.startTyping()
        
        imageUrl = await findImage(msg)
        let extension = imageUrl.split("?")[0].split(".")[imageUrl.split(".").length-1];
        
        let imgFG = await jimpReadURL(imageUrl);
        let textCanvas = await canvasText(args, Math.round(imgFG.bitmap.width*0.05), "Arial", Math.round(imgFG.bitmap.width*0.9), "left")
        let offset = textCanvas[1]+Math.round(imgFG.bitmap.width*0.075);

        let rectCanvas = await canvasRect(imgFG.bitmap.width, offset, "transparent", 0, "white")

        textCanvas[0] = await (await readBuffer(textCanvas[0])).crop(0, 0, Math.round(imgFG.bitmap.width*0.9), textCanvas[1]).getBufferAsync(Jimp.AUTO)

        let img = await exec(imageUrl, [
            ["addBackground", [imgFG.bitmap.width, imgFG.bitmap.height+offset, 'transparent', 0, 0]],
            ["composite", [rectCanvas, 0, imgFG.bitmap.height]],
            ["composite", [textCanvas[0], Math.round(imgFG.bitmap.width*0.05), imgFG.bitmap.height+Math.round(imgFG.bitmap.width*0.05)]]
        ]);

        sendImage(msg, "Caption 2", startTime, img, extension, procMsg)
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