require("dotenv").config()
const { MessageAttachment } = require('discord.js');

delete require.cache[require.resolve("../../modules/utils.js")];
let { findImage } = require("../../modules/utils.js")
var Jimp = require('jimp');

delete require.cache[require.resolve("../../modules/image.js")];
let { execNewImage, readURL, readBuffer } = require("../../modules/image.js")
let { canvasText } = require("../../modules/canvas.js")

async function cmdFunc(msg, args) {
    try {
        let procMsg = await msg.channel.send("<a:processing:807338286753906718> Processing... This may take a minute.");
        msg.channel.startTyping()
        
        let imageUrl = await findImage(msg)
        let extension = imageUrl.split(".")[imageUrl.split(".").length-1].split("?")[0];
        
        let imgFG = await readURL(await findImage(msg));
        let textCanvas = await canvasText(args, Math.round(imgFG.bitmap.width*0.05), "Arial", Math.round(imgFG.bitmap.width*0.9), "left")
        let offset = textCanvas[1]+Math.round(imgFG.bitmap.width*0.075);
        let img = await exec(imageUrl, [
            ["addBackground", [imgFG.bitmap.width, imgFG.bitmap.height+offset, '#FFFFFF', 0, 0]],
            ["composite", [textCanvas[0], Math.round(imgFG.bitmap.width*0.05), imgFG.bitmap.height+Math.round(imgFG.bitmap.width*0.05)]]
        ]);
        const attachment = new MessageAttachment(img, "image."+extension);
        msg.channel.stopTyping()
        msg.channel.send(attachment)
        procMsg.delete();
    } catch(e) {
        console.log(e)
        msg.channel.stopTyping()
        msg.channel.send("It broke")
    }
}

module.exports = {
    cmdFunc
}